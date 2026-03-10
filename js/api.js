/**
 * api.js - Intégration des APIs d'emploi
 * Gère les appels à l'API France Travail et la génération des liens plateformes
 */

const API = {
    // Token France Travail en cache
    _token: null,
    _tokenExpiry: null,

    /**
     * Retourner l'URL préfixée avec le proxy CORS actif si activé
     */
    _getProxyUrl(url) {
        if (!CONFIG.proxy.enabled) return url;
        const proxyBase = CONFIG.proxy.urls[CONFIG.proxy.currentIndex] || CONFIG.proxy.urls[0];
        return proxyBase + encodeURIComponent(url);
    },

    /**
     * Obtenir un token OAuth2 France Travail via proxy CORS
     */
    async getFranceTravailToken() {
        const clientId = localStorage.getItem(CONFIG.storage.franceTravailClientId);
        const clientSecret = localStorage.getItem(CONFIG.storage.franceTravailClientSecret);

        if (!clientId || !clientSecret) {
            throw new Error('Clés API France Travail non configurées');
        }

        // Vérifier si le token en cache est encore valide
        const cachedToken = localStorage.getItem(CONFIG.storage.franceTravailToken);
        const cachedExpiry = localStorage.getItem(CONFIG.storage.franceTravailTokenExpiry);
        if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
            return cachedToken;
        }

        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: CONFIG.franceTravail.scope
        });

        // Pour le token (POST), utiliser toujours corsproxy.io qui supporte les requêtes POST
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(CONFIG.franceTravail.tokenUrl);

        let response;
        try {
            response = await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
        } catch (e) {
            throw new Error('Le proxy CORS ne répond pas. Vérifiez votre connexion internet. (' + e.message + ')');
        }

        if (response.status === 401 || response.status === 403) {
            throw new Error('Client ID ou Secret invalide. Vérifiez vos clés API France Travail.');
        }

        if (!response.ok) {
            let detail = '';
            try {
                const errData = await response.json();
                detail = errData.error_description || errData.error || '';
            } catch (_) {}
            throw new Error(`Erreur authentification France Travail (${response.status})${detail ? ' : ' + detail : ''}`);
        }

        const data = await response.json();
        const token = data.access_token;
        if (!token) {
            throw new Error('Réponse inattendue de France Travail : aucun token reçu');
        }
        const expiresIn = (data.expires_in || 1490) * 1000;

        // Sauvegarder le token
        // On retire 60s (60000ms) comme marge de sécurité pour éviter les expirations en cours de requête
        localStorage.setItem(CONFIG.storage.franceTravailToken, token);
        localStorage.setItem(CONFIG.storage.franceTravailTokenExpiry, Date.now() + expiresIn - 60000);

        return token;
    },

    /**
     * Rechercher des offres sur France Travail pour un mot-clé et un département
     */
    async rechercherFranceTravail(motCle, departement) {
        let token;
        try {
            token = await this.getFranceTravailToken();
        } catch (e) {
            console.warn('Impossible d\'obtenir le token France Travail :', e.message);
            return [];
        }

        const params = new URLSearchParams({
            motsCles: motCle,
            departement: departement,
            typeContrat: 'CDI,CDD,MIS,LIB',
            range: '0-49',
            sort: '1'
        });

        const searchUrl = `${CONFIG.franceTravail.searchUrl}?${params.toString()}`;
        const proxyUrl = this._getProxyUrl(searchUrl);

        try {
            const response = await fetch(proxyUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 204) return []; // Aucune offre
            if (response.status === 401) {
                // Token expiré, effacer le cache
                localStorage.removeItem(CONFIG.storage.franceTravailToken);
                localStorage.removeItem(CONFIG.storage.franceTravailTokenExpiry);
                console.warn(`Token France Travail expiré, il sera renouvelé à la prochaine requête`);
                return [];
            }
            if (!response.ok) {
                console.warn(`Erreur API France Travail (${departement}/${motCle}) : ${response.status}`);
                return [];
            }

            const data = await response.json();
            return (data.resultats || []).map(offre => this.normaliserOffreFranceTravail(offre, motCle));
        } catch (e) {
            console.warn('Erreur réseau France Travail :', e.message);
            return [];
        }
    },

    /**
     * Normaliser une offre France Travail au format commun
     */
    normaliserOffreFranceTravail(offre, motCleSource) {
        const departement = offre.lieuTravail?.codePostal?.substring(0, 2) ||
                           offre.lieuTravail?.commune?.substring(0, 2) || '';

        // Calculer l'indice de fiabilité
        const fiabilite = this.calculerFiabilite(offre, 'france-travail');

        return {
            id: `ft-${offre.id}`,
            source: 'France Travail',
            sourceIcone: '🏛️',
            sourceCouleur: '#003189',
            titre: offre.intitule || 'Poste non renseigné',
            entreprise: offre.entreprise?.nom || 'Entreprise non renseignée',
            lieu: offre.lieuTravail?.libelle || 'Lieu non renseigné',
            departement: departement,
            codePostal: offre.lieuTravail?.codePostal || '',
            datePublication: offre.dateCreation || offre.dateActualisation || null,
            typeContrat: offre.typeContrat || 'NC',
            typeContratLibelle: offre.typeContratLibelle || offre.typeContrat || 'Non renseigné',
            salaire: offre.salaire?.libelle || null,
            modesTravail: this.extraireModesTravail(offre),
            experience: offre.experienceExige || offre.experienceLibelle || null,
            description: offre.description || '',
            missions: this.extraireMissions(offre.description || ''),
            competences: (offre.competences || []).map(c => c.libelle).filter(Boolean),
            qualifications: offre.qualitesProfessionnelles || [],
            url: `https://candidat.francetravail.fr/offres/recherche/detail/${offre.id}`,
            fiabilite: fiabilite,
            motCleSource: motCleSource,
            raw: offre
        };
    },

    /**
     * Extraire les missions principales de la description
     */
    extraireMissions(description) {
        if (!description) return [];

        const lignes = description.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 10);
        const missions = [];

        // Chercher les sections de missions
        let dansMissions = false;
        const keywordsMissions = ['mission', 'tâche', 'activité', 'responsabilité', 'vous serez', 'votre rôle', 'vous aurez'];
        const keywordsStop = ['profil', 'compétence', 'formation', 'qualification', 'nous offrons', 'rémunération'];

        for (const ligne of lignes) {
            const ligneLower = ligne.toLowerCase();

            if (keywordsMissions.some(k => ligneLower.includes(k))) {
                dansMissions = true;
                continue;
            }

            if (keywordsStop.some(k => ligneLower.includes(k))) {
                dansMissions = false;
            }

            if (dansMissions && (ligne.startsWith('-') || ligne.startsWith('•') || ligne.startsWith('*') || ligne.match(/^\d+[\.\)]/))) {
                missions.push(ligne.replace(/^[-•*\d\.\)]+\s*/, '').trim());
            }
        }

        // Si pas de missions trouvées, prendre les premières lignes pertinentes
        if (missions.length === 0) {
            const premieresLignes = lignes.filter(l =>
                l.length > 20 &&
                (l.startsWith('-') || l.startsWith('•') || l.startsWith('*'))
            ).slice(0, 5);
            missions.push(...premieresLignes.map(l => l.replace(/^[-•*]+\s*/, '').trim()));
        }

        return missions.slice(0, 6); // Max 6 missions
    },

    /**
     * Extraire les modes de travail (télétravail, hybride, présentiel)
     */
    extraireModesTravail(offre) {
        const modes = [];

        if (offre.deplacementsCode || offre.deplacementsLibelle) {
            return [offre.deplacementsLibelle || 'Déplacements'];
        }

        const description = (offre.description || '').toLowerCase();
        if (description.includes('télétravail') || description.includes('teletravail') || description.includes('remote')) {
            if (description.includes('hybride') || description.includes('partiel')) {
                modes.push('Hybride');
            } else {
                modes.push('Télétravail');
            }
        } else if (offre.lieuTravail) {
            modes.push('Présentiel');
        }

        return modes;
    },

    /**
     * Calculer l'indice de fiabilité d'une offre (0-100)
     */
    calculerFiabilite(offre, source) {
        let score = 0;

        // Source officielle = +30 points
        if (source === 'france-travail') score += 30;

        // Date récente
        const dateStr = offre.dateCreation || offre.dateActualisation;
        if (dateStr) {
            const date = new Date(dateStr);
            const maintenant = new Date();
            const jours = (maintenant - date) / (1000 * 60 * 60 * 24);
            if (jours <= 1) score += 25;
            else if (jours <= 7) score += 20;
            else if (jours <= 30) score += 10;
            else score += 5;
        }

        // Informations complètes
        if (offre.intitule) score += 10;
        if (offre.entreprise?.nom) score += 10;
        if (offre.description && offre.description.length > 200) score += 10;
        if (offre.salaire?.libelle) score += 10;
        if (offre.lieuTravail?.libelle) score += 5;

        return Math.min(100, score);
    },

    /**
     * Lancer toutes les recherches France Travail pour tous les mots-clés et départements
     */
    async rechercherToutesOffres(onProgress) {
        const clientId = localStorage.getItem(CONFIG.storage.franceTravailClientId);
        if (!clientId) {
            console.warn('API France Travail non configurée');
            return [];
        }

        const departements = Object.keys(CONFIG.departements);
        const mots = CONFIG.keywords;
        const offresMap = new Map(); // Dédupliquer par ID
        let total = departements.length * mots.length;
        let fait = 0;

        for (const dept of departements) {
            for (const mot of mots) {
                const offres = await this.rechercherFranceTravail(mot, dept);
                for (const offre of offres) {
                    if (!offresMap.has(offre.id)) {
                        offresMap.set(offre.id, offre);
                    }
                }
                fait++;
                if (onProgress) onProgress(Math.round((fait / total) * 100));
                // Pause de 200ms entre chaque requête pour respecter le rate-limiting de l'API France Travail
                await new Promise(r => setTimeout(r, 200));
            }
        }

        return Array.from(offresMap.values());
    },

    /**
     * Générer les liens de recherche pré-filtrés pour toutes les plateformes
     */
    obtenirLiensPlateformes() {
        return CONFIG.plateformes;
    },

    /**
     * Analyser une offre avec l'IA OpenAI
     */
    async analyserAvecIA(offre) {
        const apiKey = localStorage.getItem(CONFIG.storage.openaiKey);
        if (!apiKey) {
            throw new Error('Clé API OpenAI non configurée');
        }

        const prompt = this.construirePromptIA(offre);

        const response = await fetch(CONFIG.openai.url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.openai.model,
                messages: [
                    {
                        role: 'system',
                        content: `Tu es un conseiller en recrutement expert en marketing, communication et digital. 
Tu analyses des offres d'emploi réelles et fournis des conseils personnalisés et concrets pour aider les candidats à postuler efficacement.
Tes conseils sont UNIQUEMENT basés sur les informations réelles de l'offre fournie. Tu n'inventes jamais d'informations.
Tu réponds toujours en français avec un ton professionnel et encourageant.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: CONFIG.openai.maxTokens,
                temperature: CONFIG.openai.temperature
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Erreur API OpenAI : ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'Analyse non disponible';
    },

    /**
     * Construire le prompt IA à partir des données de l'offre
     */
    construirePromptIA(offre) {
        const infos = [];

        infos.push(`**OFFRE D'EMPLOI À ANALYSER :**`);
        infos.push(`- Titre : ${offre.titre}`);
        infos.push(`- Entreprise : ${offre.entreprise}`);
        infos.push(`- Lieu : ${offre.lieu}`);
        infos.push(`- Type de contrat : ${offre.typeContratLibelle || offre.typeContrat}`);
        if (offre.salaire) infos.push(`- Salaire : ${offre.salaire}`);
        if (offre.experience) infos.push(`- Expérience requise : ${offre.experience}`);
        if (offre.modesTravail?.length) infos.push(`- Mode de travail : ${offre.modesTravail.join(', ')}`);

        if (offre.missions?.length) {
            infos.push(`\n**MISSIONS PRINCIPALES :**`);
            offre.missions.forEach(m => infos.push(`- ${m}`));
        }

        if (offre.competences?.length) {
            infos.push(`\n**COMPÉTENCES DEMANDÉES :**`);
            offre.competences.forEach(c => infos.push(`- ${c}`));
        }

        if (offre.description) {
            infos.push(`\n**DESCRIPTION COMPLÈTE :**`);
            infos.push(offre.description.substring(0, 1500));
        }

        infos.push(`\n---`);
        infos.push(`Analyse cette offre d'emploi et fournis des conseils personnalisés structurés en 5 sections :`);
        infos.push(`1. 🎯 **Points forts à mettre en avant dans le CV** (basés uniquement sur les besoins réels de l'offre)`);
        infos.push(`2. ✉️ **Conseils pour la lettre de motivation** (accroche, arguments clés, structure)`);
        infos.push(`3. 💡 **Compétences clés à démontrer** (tirées directement des exigences de l'offre)`);
        infos.push(`4. ❓ **Questions probables en entretien** (préparées selon le poste et l'entreprise)`);
        infos.push(`5. ⭐ **Conseils pour se démarquer** (spécifiques à cette offre et cette entreprise)`);
        infos.push(`\nSois précis, concret et adapté à CETTE offre spécifique. Ne donne pas de conseils génériques.`);

        return infos.join('\n');
    },

    /**
     * Vérifier si une offre doit être exclue (alternance, stage)
     */
    doitExclure(offre) {
        const titreDesc = `${offre.titre} ${offre.description}`.toLowerCase();
        return CONFIG.termesExclus.some(terme => titreDesc.includes(terme));
    },

    /**
     * Filtrer les offres selon les critères de l'application
     */
    filtrerOffres(offres) {
        return offres.filter(offre => {
            // Exclure alternance/stage
            if (this.doitExclure(offre)) return false;

            // Garder uniquement les contrats acceptés
            const contratCode = offre.typeContrat?.toUpperCase();
            if (!CONFIG.contratsAcceptes.includes(contratCode)) return false;

            // Garder uniquement les départements des Pays de la Loire
            const dept = offre.departement;
            if (!CONFIG.departements[dept]) return false;

            return true;
        });
    }
};
