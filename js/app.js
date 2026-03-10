/**
 * app.js - Logique principale de l'application My Dream Job
 * Orchestration, initialisation, affichage des cartes d'offres, compte à rebours
 */

const APP = {
    // Toutes les offres chargées (brut, filtrées alternance/stage/contrat)
    _offres: [],
    // Offres affichées (après filtres UI)
    _offresAffichees: [],
    // Timer d'actualisation
    _timerActualisation: null,
    _timerCompteARebours: null,
    _prochainActualisation: null,
    // État de chargement
    _chargement: false,

    /**
     * Initialiser l'application
     */
    async init() {
        this._appliquerTheme();
        NOTIFICATIONS.init();
        AI_ADVISOR.init();
        this._attacherEvenements();
        this._rendrePanneauFiltres();
        this._rendreLiensPlateformes();

        // Vérifier la configuration au premier lancement
        const configFaite = localStorage.getItem(CONFIG.storage.configDone);
        if (!configFaite) {
            this._mettreAJourStatutConnexion('attente');
            this._afficherModeDemo();
            this._afficherModalConfig();
        } else {
            await this.actualiser();
        }

        // Démarrer le compte à rebours
        this._demarrerCompteARebours();
    },

    /**
     * Attacher tous les événements UI
     */
    _attacherEvenements() {
        // Bouton actualiser
        document.getElementById('btn-actualiser')?.addEventListener('click', () => this.actualiser());

        // Bouton paramètres
        document.getElementById('btn-parametres')?.addEventListener('click', () => this._afficherModalConfig());

        // Toggle thème
        document.getElementById('toggle-theme')?.addEventListener('click', () => this._toggleTheme());

        // Recherche libre
        const inputRecherche = document.getElementById('input-recherche');
        if (inputRecherche) {
            inputRecherche.addEventListener('input', e => {
                FILTERS.definirRecherche(e.target.value);
                this._appliquerEtAfficher();
            });
        }

        // Tri
        document.getElementById('select-tri')?.addEventListener('change', e => {
            FILTERS.definirTri(e.target.value);
            this._appliquerEtAfficher();
        });

        // Période
        document.querySelectorAll('.filtre-periode').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.filtre-periode').forEach(b => b.classList.remove('actif'));
                e.target.classList.add('actif');
                FILTERS.definirPeriode(e.target.dataset.periode);
                this._appliquerEtAfficher();
            });
        });

        // Fermeture modal config
        document.getElementById('modal-config-fermer')?.addEventListener('click', () => this._fermerModalConfig());
        document.getElementById('modal-config-overlay')?.addEventListener('click', () => this._fermerModalConfig());
        document.getElementById('btn-sauvegarder-config')?.addEventListener('click', () => this._sauvegarderConfig());

        // Toggle son
        document.getElementById('btn-son')?.addEventListener('click', () => {
            const actif = NOTIFICATIONS.toggleSon();
            const btn = document.getElementById('btn-son');
            if (btn) btn.title = actif ? 'Son activé' : 'Son désactivé';
            btn?.classList.toggle('actif', actif);
        });

        // Réinitialiser filtres
        document.getElementById('btn-reset-filtres')?.addEventListener('click', () => {
            FILTERS.reinitialiser();
            this._mettreAJourFiltresUI();
            this._appliquerEtAfficher();
        });
    },

    /**
     * Actualiser toutes les offres
     */
    async actualiser() {
        if (this._chargement) return;
        this._chargement = true;
        this._afficherChargement(true);

        const clientId = localStorage.getItem(CONFIG.storage.franceTravailClientId);
        if (!clientId) {
            this._mettreAJourStatutConnexion('attente');
            this._afficherModeDemo();
            this._chargement = false;
            this._afficherChargement(false);
            return;
        }

        try {
            // Récupérer les offres depuis France Travail
            const offresRaw = await API.rechercherToutesOffres(progress => {
                this._mettreAJourProgressBar(progress);
            });

            // Filtrer les alternances, stages et contrats non désirés
            this._offres = API.filtrerOffres(offresRaw);

            FILTERS.definirOffres(this._offres);

            // Mettre à jour les compteurs dans les filtres
            this._mettreAJourCompteurs();

            // Appliquer les filtres UI et afficher
            this._appliquerEtAfficher();

            // Vérifier les alertes Angers
            NOTIFICATIONS.verifierNouvellesOffres(this._offres);

            // Sauvegarder l'heure de dernière actualisation
            localStorage.setItem(CONFIG.storage.lastRefresh, new Date().toISOString());
            this._mettreAJourDerniereActualisation();

            // Réinitialiser le compte à rebours
            this._reinitialiserCompteARebours();

            const nb = this._offres.length;
            if (nb > 0) {
                this._mettreAJourStatutConnexion('connecte');
                NOTIFICATIONS.afficherToast(`✅ ${nb} offre(s) chargée(s) avec succès !`, 'success');
            } else {
                this._mettreAJourStatutConnexion('attente');
                NOTIFICATIONS.afficherToast('⚠️ Aucune offre trouvée. Vérifiez votre clé API France Travail.', 'warning');
            }
        } catch (e) {
            console.error('Erreur lors de l\'actualisation :', e);
            this._mettreAJourStatutConnexion('erreur', e.message);
            NOTIFICATIONS.afficherToast('❌ Erreur de connexion à France Travail : ' + e.message, 'error');
            // Afficher le mode démo si aucune offre n'est chargée
            if (this._offres.length === 0) {
                this._afficherModeDemo();
            }
        } finally {
            this._chargement = false;
            this._afficherChargement(false);
        }
    },

    /**
     * Appliquer les filtres et afficher les offres
     */
    _appliquerEtAfficher() {
        this._offresAffichees = FILTERS.appliquerFiltres(this._offres);
        this._afficherOffres(this._offresAffichees);
        this._mettreAJourCompteurTotal(this._offresAffichees.length);
    },

    /**
     * Afficher les cartes d'offres dans la grille
     */
    _afficherOffres(offres) {
        const grille = document.getElementById('grille-offres');
        if (!grille) return;

        if (offres.length === 0) {
            grille.innerHTML = `
                <div class="offres-vides">
                    <div class="offres-vides-icone">🔍</div>
                    <h3>Aucune offre trouvée</h3>
                    <p>
                        ${this._offres.length === 0
                            ? 'Configurez votre clé API France Travail et cliquez sur "Actualiser" pour charger les offres.'
                            : 'Essayez de modifier vos filtres ou votre recherche.'}
                    </p>
                    ${this._offres.length === 0 ? `
                        <button class="btn-primaire" onclick="APP._afficherModalConfig()">
                            ⚙️ Configurer l'API
                        </button>
                    ` : `
                        <button class="btn-secondaire" onclick="FILTERS.reinitialiser(); APP._mettreAJourFiltresUI(); APP._appliquerEtAfficher();">
                            🔄 Réinitialiser les filtres
                        </button>
                    `}
                </div>
            `;
            return;
        }

        grille.innerHTML = offres.map(offre => this._creerCarteOffre(offre)).join('');

        // Attacher les événements aux cartes
        grille.querySelectorAll('.btn-ia').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = e.currentTarget.dataset.id;
                AI_ADVISOR.analyser(id);
            });
        });

        grille.querySelectorAll('.btn-description').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = e.currentTarget.dataset.id;
                this._toggleDescription(id);
            });
        });
    },

    /**
     * Créer le HTML d'une carte d'offre
     */
    _creerCarteOffre(offre) {
        const dateFormatee = this._formaterDate(offre.datePublication);
        const fiabiliteClasse = offre.fiabilite >= 70 ? 'haute' : offre.fiabilite >= 40 ? 'moyenne' : 'basse';
        const badgeAngers = offre.departement === '49' ? '<span class="badge-angers" title="Offre dans le 49 - Angers">🔔 Angers</span>' : '';
        const nomDept = CONFIG.departements[offre.departement]?.nom || offre.departement;
        const badgeContrat = CONFIG.badgesContrat[offre.typeContrat] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
        const labelContrat = CONFIG.contratsLabels[offre.typeContrat] || offre.typeContrat;

        const missionsHtml = offre.missions?.length
            ? `<div class="offre-missions">
                <strong>📋 Missions principales :</strong>
                <ul>${offre.missions.map(m => `<li>${this._echapper(m)}</li>`).join('')}</ul>
               </div>`
            : '';

        const competencesHtml = offre.competences?.length
            ? `<div class="offre-competences">
                ${offre.competences.slice(0, 5).map(c =>
                    `<span class="tag-competence">${this._echapper(c)}</span>`
                ).join('')}
               </div>`
            : '';

        const salaireHtml = offre.salaire
            ? `<div class="offre-meta-item" title="Salaire">
                💰 ${this._echapper(offre.salaire)}
               </div>`
            : '';

        const modesTravailHtml = offre.modesTravail?.length
            ? `<div class="offre-meta-item" title="Mode de travail">
                🏠 ${offre.modesTravail.map(m => this._echapper(m)).join(', ')}
               </div>`
            : '';

        const experienceHtml = offre.experience
            ? `<div class="offre-meta-item" title="Expérience">
                📈 ${this._echapper(offre.experience)}
               </div>`
            : '';

        return `
        <article class="carte-offre ${offre.departement === '49' ? 'carte-angers' : ''}" data-id="${this._echapper(offre.id)}">
            <div class="carte-header">
                <div class="carte-titre-wrap">
                    <h3 class="carte-titre">${this._echapper(offre.titre)}</h3>
                    ${badgeAngers}
                </div>
                <div class="carte-source">
                    <span class="source-icone" style="color:${offre.sourceCouleur}">${offre.sourceIcone}</span>
                    <span class="source-nom">${this._echapper(offre.source)}</span>
                </div>
            </div>

            <div class="carte-entreprise">
                <span class="entreprise-icone">🏢</span>
                <strong>${this._echapper(offre.entreprise)}</strong>
            </div>

            <div class="carte-meta">
                <div class="offre-meta-item">
                    <span class="badge-contrat" style="background:${badgeContrat.bg};color:${badgeContrat.text};border:1px solid ${badgeContrat.border}">
                        ${labelContrat}
                    </span>
                </div>
                <div class="offre-meta-item" title="Localisation">
                    📍 ${this._echapper(offre.lieu)}
                    <span class="dept-badge">Dép. ${offre.departement}</span>
                </div>
                <div class="offre-meta-item" title="Date de publication">
                    📅 ${dateFormatee}
                </div>
                ${salaireHtml}
                ${modesTravailHtml}
                ${experienceHtml}
            </div>

            ${missionsHtml}
            ${competencesHtml}

            <div class="carte-description-preview" id="desc-preview-${this._echapper(offre.id)}">
                ${offre.description
                    ? `<p class="description-texte">${this._echapper(offre.description.substring(0, 200))}${offre.description.length > 200 ? '...' : ''}</p>`
                    : '<p class="description-vide">Description non renseignée</p>'}
            </div>

            <div class="carte-description-complete" id="desc-complete-${this._echapper(offre.id)}" style="display:none;">
                <p class="description-texte">${offre.description ? this._echapper(offre.description) : 'Description non renseignée'}</p>
            </div>

            <div class="carte-fiabilite" title="Indice de fiabilité">
                <div class="fiabilite-label">
                    <span>Fiabilité</span>
                    <strong>${offre.fiabilite}%</strong>
                </div>
                <div class="fiabilite-barre">
                    <div class="fiabilite-remplissage fiabilite-${fiabiliteClasse}" style="width:${offre.fiabilite}%"></div>
                </div>
            </div>

            <div class="carte-actions">
                <a href="${this._echapper(offre.url)}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="btn-voir-offre">
                    Voir l'offre →
                </a>
                ${offre.description && offre.description.length > 200
                    ? `<button class="btn-description btn-secondaire" data-id="${this._echapper(offre.id)}" aria-expanded="false">
                        📄 Voir plus
                       </button>`
                    : ''}
                <button class="btn-ia" data-id="${this._echapper(offre.id)}" title="Analyser avec l'IA OpenAI">
                    ✨ Analyser avec l'IA
                </button>
            </div>
        </article>`;
    },

    /**
     * Toggle la description complète d'une offre
     */
    _toggleDescription(offreId) {
        const preview = document.getElementById(`desc-preview-${offreId}`);
        const complete = document.getElementById(`desc-complete-${offreId}`);
        const btn = document.querySelector(`.btn-description[data-id="${offreId}"]`);

        if (!preview || !complete) return;

        const ouvert = complete.style.display !== 'none';
        preview.style.display = ouvert ? 'block' : 'none';
        complete.style.display = ouvert ? 'none' : 'block';
        if (btn) {
            btn.textContent = ouvert ? '📄 Voir plus' : '📄 Voir moins';
            btn.setAttribute('aria-expanded', !ouvert);
        }
    },

    /**
     * Rendre le panneau de filtres gauche
     */
    _rendrePanneauFiltres() {
        this._rendreFiltresDepartements();
        this._rendreFiltresContrats();
        this._rendreFiltresMotsCles();
    },

    /**
     * Rendre les filtres de départements
     */
    _rendreFiltresDepartements() {
        const container = document.getElementById('filtres-departements');
        if (!container) return;

        container.innerHTML = Object.entries(CONFIG.departements).map(([code, dept]) => `
            <label class="filtre-item ${dept.prioritaire ? 'filtre-prioritaire' : ''}">
                <input type="checkbox" class="filtre-dept-cb" value="${code}"
                    onchange="APP._onFiltreDeptChange('${code}', this.checked)">
                <span class="filtre-label">
                    ${dept.prioritaire ? '🔔 ' : ''}<strong>${code}</strong> — ${dept.nom}
                </span>
                <span class="filtre-compteur" id="compteur-dept-${code}">0</span>
            </label>
        `).join('');
    },

    /**
     * Rendre les filtres de contrats
     */
    _rendreFiltresContrats() {
        const container = document.getElementById('filtres-contrats');
        if (!container) return;

        container.innerHTML = CONFIG.contratsAcceptes.map(code => `
            <label class="filtre-item">
                <input type="checkbox" class="filtre-contrat-cb" value="${code}"
                    onchange="APP._onFiltreContratChange('${code}', this.checked)">
                <span class="filtre-label">${CONFIG.contratsLabels[code] || code}</span>
                <span class="filtre-compteur" id="compteur-contrat-${code}">0</span>
            </label>
        `).join('');
    },

    /**
     * Rendre les filtres de mots-clés
     */
    _rendreFiltresMotsCles() {
        const container = document.getElementById('filtres-mots-cles');
        if (!container) return;

        container.innerHTML = `
            <label class="filtre-item">
                <input type="radio" name="filtre-mot-cle" value="" checked
                    onchange="APP._onFiltreMotCleChange('')">
                <span class="filtre-label">Tous les mots-clés</span>
                <span class="filtre-compteur" id="compteur-mc-tout">0</span>
            </label>
            ${CONFIG.keywords.map(mot => `
                <label class="filtre-item">
                    <input type="radio" name="filtre-mot-cle" value="${mot}"
                        onchange="APP._onFiltreMotCleChange('${mot}')">
                    <span class="filtre-label">${mot}</span>
                    <span class="filtre-compteur" id="compteur-mc-${mot.replace(/\s+/g, '-')}">0</span>
                </label>
            `).join('')}
        `;
    },

    /**
     * Rendre les liens vers les plateformes
     */
    _rendreLiensPlateformes() {
        const container = document.getElementById('liens-plateformes');
        if (!container) return;

        container.innerHTML = CONFIG.plateformes.map(p => `
            <a href="${p.url}"
               target="_blank"
               rel="noopener noreferrer"
               class="lien-plateforme"
               title="${this._echapper(p.description)}"
               style="--couleur-plateforme:${p.couleur}">
                <span class="plateforme-icone">${p.icone}</span>
                <span class="plateforme-nom">${this._echapper(p.nom)}</span>
                <span class="plateforme-fleche">→</span>
            </a>
        `).join('');
    },

    /**
     * Mettre à jour les compteurs dans les filtres
     */
    _mettreAJourCompteurs() {
        // Compteurs départements
        const cptDept = FILTERS.compteursDepartements(this._offres);
        Object.entries(cptDept).forEach(([dept, nb]) => {
            const el = document.getElementById(`compteur-dept-${dept}`);
            if (el) el.textContent = nb;
        });

        // Compteur Angers spécial
        const comptAngers = document.getElementById('compteur-angers');
        if (comptAngers) comptAngers.textContent = cptDept['49'] || 0;

        // Compteurs contrats
        const cptContrat = FILTERS.compteursContrats(this._offres);
        Object.entries(cptContrat).forEach(([contrat, nb]) => {
            const el = document.getElementById(`compteur-contrat-${contrat}`);
            if (el) el.textContent = nb;
        });

        // Compteurs mots-clés
        const cptMots = FILTERS.compteursMotsCles(this._offres);
        const elTout = document.getElementById('compteur-mc-tout');
        if (elTout) elTout.textContent = this._offres.length;
        CONFIG.keywords.forEach(mot => {
            const el = document.getElementById(`compteur-mc-${mot.replace(/\s+/g, '-')}`);
            if (el) el.textContent = cptMots[mot] || 0;
        });
    },

    /**
     * Mettre à jour le compteur total d'offres affiché
     */
    _mettreAJourCompteurTotal(nb) {
        const el = document.getElementById('compteur-offres-total');
        if (el) el.textContent = nb;
    },

    /**
     * Mettre à jour l'heure de dernière actualisation
     */
    _mettreAJourDerniereActualisation() {
        const el = document.getElementById('derniere-actualisation');
        if (el) {
            const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            el.textContent = `Dernière mise à jour : ${heure}`;
        }
    },

    /**
     * Mettre à jour les filtres UI (après réinitialisation)
     */
    _mettreAJourFiltresUI() {
        document.querySelectorAll('.filtre-dept-cb').forEach(cb => { cb.checked = false; });
        document.querySelectorAll('.filtre-contrat-cb').forEach(cb => { cb.checked = false; });
        document.querySelectorAll('.filtre-periode').forEach(btn => btn.classList.remove('actif'));
        document.querySelector('.filtre-periode[data-periode="tout"]')?.classList.add('actif');
        const inputRecherche = document.getElementById('input-recherche');
        if (inputRecherche) inputRecherche.value = '';
        const selectTri = document.getElementById('select-tri');
        if (selectTri) selectTri.value = 'date';
        const radioAll = document.querySelector('input[name="filtre-mot-cle"][value=""]');
        if (radioAll) radioAll.checked = true;
    },

    /**
     * Callbacks filtres
     */
    _onFiltreDeptChange(dept, checked) {
        if (checked) FILTERS.actifs.departements.add(dept);
        else FILTERS.actifs.departements.delete(dept);
        this._appliquerEtAfficher();
    },

    _onFiltreContratChange(contrat, checked) {
        if (checked) FILTERS.actifs.contrats.add(contrat);
        else FILTERS.actifs.contrats.delete(contrat);
        this._appliquerEtAfficher();
    },

    _onFiltreMotCleChange(motCle) {
        FILTERS.definirMotCle(motCle);
        this._appliquerEtAfficher();
    },

    /**
     * Afficher/masquer l'indicateur de chargement
     */
    _afficherChargement(actif) {
        const btn = document.getElementById('btn-actualiser');
        const loadingBar = document.getElementById('loading-bar');
        const spinnerGlobal = document.getElementById('spinner-global');

        if (btn) {
            btn.disabled = actif;
            btn.innerHTML = actif
                ? '<span class="spinner-btn"></span> Chargement...'
                : '🔄 Actualiser maintenant';
        }
        if (loadingBar) loadingBar.style.display = actif ? 'block' : 'none';
        if (spinnerGlobal) spinnerGlobal.style.display = actif ? 'flex' : 'none';
    },

    /**
     * Mettre à jour la barre de progression
     */
    _mettreAJourProgressBar(progress) {
        const bar = document.getElementById('progress-fill');
        if (bar) bar.style.width = `${progress}%`;
    },

    /**
     * Démarrer le compte à rebours d'actualisation automatique
     */
    _demarrerCompteARebours() {
        this._reinitialiserCompteARebours();
    },

    /**
     * Réinitialiser le compte à rebours
     */
    _reinitialiserCompteARebours() {
        if (this._timerActualisation) clearTimeout(this._timerActualisation);
        if (this._timerCompteARebours) clearInterval(this._timerCompteARebours);

        this._prochainActualisation = Date.now() + CONFIG.app.refreshInterval;

        // Timer pour l'actualisation automatique
        this._timerActualisation = setTimeout(() => {
            this.actualiser();
        }, CONFIG.app.refreshInterval);

        // Mise à jour du compte à rebours chaque seconde
        this._timerCompteARebours = setInterval(() => {
            this._afficherCompteARebours();
        }, 1000);

        this._afficherCompteARebours();
    },

    /**
     * Afficher le compte à rebours
     */
    _afficherCompteARebours() {
        const el = document.getElementById('compte-a-rebours');
        if (!el || !this._prochainActualisation) return;

        const restant = Math.max(0, this._prochainActualisation - Date.now());
        const minutes = Math.floor(restant / 60000);
        const secondes = Math.floor((restant % 60000) / 1000);

        el.textContent = `${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
    },

    /**
     * Afficher le modal de configuration des APIs
     */
    _afficherModalConfig() {
        const modal = document.getElementById('modal-config');
        if (!modal) return;

        // Pré-remplir les champs existants
        const clientId = localStorage.getItem(CONFIG.storage.franceTravailClientId) || '';
        const clientSecret = localStorage.getItem(CONFIG.storage.franceTravailClientSecret) || '';
        const openaiKey = localStorage.getItem(CONFIG.storage.openaiKey) || '';

        const champClientId = document.getElementById('config-ft-client-id');
        const champClientSecret = document.getElementById('config-ft-client-secret');
        const champOpenAI = document.getElementById('config-openai-key');

        if (champClientId) champClientId.value = clientId;
        if (champClientSecret) champClientSecret.value = clientSecret;
        if (champOpenAI) champOpenAI.value = openaiKey;

        modal.classList.add('ouvert');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Fermer le modal de configuration
     */
    _fermerModalConfig() {
        const modal = document.getElementById('modal-config');
        if (modal) {
            modal.classList.remove('ouvert');
            document.body.style.overflow = '';
        }
        // Si c'est le premier lancement et qu'on ferme sans configurer, actualiser quand même
        if (!localStorage.getItem(CONFIG.storage.configDone)) {
            localStorage.setItem(CONFIG.storage.configDone, 'true');
            this.actualiser();
        }
    },

    /**
     * Sauvegarder la configuration des APIs
     */
    async _sauvegarderConfig() {
        const clientId = document.getElementById('config-ft-client-id')?.value.trim();
        const clientSecret = document.getElementById('config-ft-client-secret')?.value.trim();
        const openaiKey = document.getElementById('config-openai-key')?.value.trim();

        if (clientId) {
            localStorage.setItem(CONFIG.storage.franceTravailClientId, clientId);
        }
        if (clientSecret) {
            localStorage.setItem(CONFIG.storage.franceTravailClientSecret, clientSecret);
        }
        if (openaiKey) {
            // Les clés OpenAI commencent généralement par 'sk-' (ex: sk-... ou sk-proj-...)
            if (!openaiKey.startsWith('sk-')) {
                NOTIFICATIONS.afficherToast('⚠️ La clé OpenAI semble invalide (doit commencer par "sk-")', 'warning');
                return;
            }
            localStorage.setItem(CONFIG.storage.openaiKey, openaiKey);
        }

        localStorage.setItem(CONFIG.storage.configDone, 'true');
        this._fermerModalConfig();
        NOTIFICATIONS.afficherToast('✅ Configuration sauvegardée !', 'success');

        // Relancer l'actualisation si une clé France Travail est définie
        if (clientId || clientSecret) {
            // Effacer le token en cache
            localStorage.removeItem(CONFIG.storage.franceTravailToken);
            localStorage.removeItem(CONFIG.storage.franceTravailTokenExpiry);
            await this.actualiser();
        }
    },

    /**
     * Appliquer le thème sombre/clair
     */
    _appliquerTheme() {
        const theme = localStorage.getItem(CONFIG.storage.theme) || 'clair';
        document.documentElement.setAttribute('data-theme', theme);
        const btn = document.getElementById('toggle-theme');
        if (btn) btn.textContent = theme === 'sombre' ? '☀️' : '🌙';
    },

    /**
     * Basculer le thème
     */
    _toggleTheme() {
        const actuel = document.documentElement.getAttribute('data-theme') || 'clair';
        const nouveau = actuel === 'clair' ? 'sombre' : 'clair';
        document.documentElement.setAttribute('data-theme', nouveau);
        localStorage.setItem(CONFIG.storage.theme, nouveau);
        const btn = document.getElementById('toggle-theme');
        if (btn) btn.textContent = nouveau === 'sombre' ? '☀️' : '🌙';
    },

    /**
     * Mettre à jour l'indicateur de statut de connexion dans le header
     * @param {'connecte'|'erreur'|'attente'} etat
     * @param {string} [messageErreur]
     */
    _mettreAJourStatutConnexion(etat, messageErreur) {
        const iconeEl = document.getElementById('statut-connexion-icone');
        const texteEl = document.getElementById('statut-connexion-texte');
        const conteneur = document.getElementById('statut-connexion');
        if (!iconeEl || !texteEl || !conteneur) return;

        conteneur.className = 'stat-item statut-connexion statut-' + etat;

        if (etat === 'connecte') {
            iconeEl.textContent = '✅';
            texteEl.textContent = 'Connecté à France Travail';
            conteneur.title = 'Connecté à l\'API France Travail';
        } else if (etat === 'erreur') {
            iconeEl.textContent = '❌';
            texteEl.textContent = 'Erreur de connexion';
            conteneur.title = messageErreur
                ? 'Erreur de connexion à France Travail : ' + messageErreur
                : 'Erreur de connexion à France Travail';
        } else {
            iconeEl.textContent = '⏳';
            texteEl.textContent = 'En attente de configuration';
            conteneur.title = 'Configurez vos clés API France Travail pour activer la recherche';
        }
    },

    /**
     * Afficher le mode démo/fallback quand aucune clé API n'est configurée ou que la connexion échoue
     */
    _afficherModeDemo() {
        const grille = document.getElementById('grille-offres');
        if (!grille) return;

        grille.innerHTML = `
            <div class="offres-vides mode-demo">
                <div class="offres-vides-icone">🔑</div>
                <h3>En attente de configuration</h3>
                <p class="mode-demo-description">
                    Configurez vos clés API France Travail pour voir les offres d'emploi en temps réel
                    dans les Pays de la Loire.
                </p>
                <div class="mode-demo-instructions">
                    <p>📋 <strong>Comment obtenir vos clés gratuites :</strong></p>
                    <ol>
                        <li>Rendez-vous sur <a href="https://francetravail.io/data/api/offres-emploi" target="_blank" rel="noopener noreferrer" aria-label="francetravail.io (opens in new tab)">francetravail.io</a></li>
                        <li>Créez un compte et inscrivez votre application</li>
                        <li>Copiez votre <em>Client ID</em> et <em>Client Secret</em></li>
                        <li>Cliquez sur "⚙️ Paramètres" ci-dessous pour les saisir</li>
                    </ol>
                </div>
                <button class="btn-primaire" onclick="APP._afficherModalConfig()">
                    ⚙️ Configurer l'API France Travail
                </button>
                <div class="mode-demo-alternatives">
                    <p>
                        💡 <strong>En attendant</strong>, vous pouvez chercher des offres directement sur ces plateformes :
                    </p>
                    <nav class="mode-demo-liens" aria-label="Liens vers les plateformes d'emploi">
                        ${CONFIG.plateformes.map(p => {
                            // Valider le protocole de l'URL (http/https uniquement)
                            const urlSafe = /^https?:\/\//.test(p.url) ? p.url : '#';
                            // Valider la couleur CSS (hex ou rgb uniquement)
                            const couleurSafe = /^#[0-9a-fA-F]{3,8}$/.test(p.couleur) ? p.couleur : '#3949ab';
                            return `
                            <a href="${this._echapper(urlSafe)}"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="lien-plateforme-demo"
                               aria-label="${this._echapper(p.nom)} (s'ouvre dans un nouvel onglet)"
                               style="--couleur-plateforme:${couleurSafe}">
                                <span class="plateforme-icone" aria-hidden="true">${p.icone}</span>
                                <div>
                                    <strong>${this._echapper(p.nom)}</strong>
                                    <span>${this._echapper(p.description)}</span>
                                </div>
                                <span class="plateforme-fleche" aria-hidden="true">→</span>
                            </a>`;
                        }).join('')}
                    </nav>
                </div>
            </div>
        `;
    },

    /**
     * Échapper le HTML
     */
    _echapper(texte) {
        if (!texte) return '';
        return String(texte)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Formater une date en français
     */
    _formaterDate(dateStr) {
        if (!dateStr) return 'Date non renseignée';
        try {
            const date = new Date(dateStr);
            const maintenant = new Date();
            const diffMs = maintenant - date;
            const diffH = Math.floor(diffMs / (1000 * 60 * 60));
            const diffJ = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffH < 1) return "Il y a moins d'1h";
            if (diffH < 24) return `Il y a ${diffH}h`;
            if (diffJ === 1) return 'Hier';
            if (diffJ <= 7) return `Il y a ${diffJ} jour${diffJ > 1 ? 's' : ''}`;
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return 'Date inconnue';
        }
    }
};

// Démarrer l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    APP.init();
});
