/**
 * filters.js - Système de filtrage et tri des offres d'emploi
 * Gère les filtres par département, contrat, date, mot-clé et le tri
 */

const FILTERS = {
    // État actuel des filtres
    actifs: {
        departements: new Set(),
        contrats: new Set(),
        periode: 'tout',
        motCle: '',
        recherche: '',
        tri: 'date'
    },

    // Toutes les offres chargées
    _toutesOffres: [],

    /**
     * Définir toutes les offres (appelé après chargement)
     */
    definirOffres(offres) {
        this._toutesOffres = offres;
    },

    /**
     * Basculer un filtre département
     */
    toggleDepartement(dept) {
        if (this.actifs.departements.has(dept)) {
            this.actifs.departements.delete(dept);
        } else {
            this.actifs.departements.add(dept);
        }
    },

    /**
     * Basculer un filtre contrat
     */
    toggleContrat(contrat) {
        if (this.actifs.contrats.has(contrat)) {
            this.actifs.contrats.delete(contrat);
        } else {
            this.actifs.contrats.add(contrat);
        }
    },

    /**
     * Définir la période de filtre
     */
    definirPeriode(periode) {
        this.actifs.periode = periode;
    },

    /**
     * Définir le mot-clé source
     */
    definirMotCle(motCle) {
        this.actifs.motCle = motCle;
    },

    /**
     * Définir la recherche libre
     */
    definirRecherche(texte) {
        this.actifs.recherche = texte.toLowerCase().trim();
    },

    /**
     * Définir le tri
     */
    definirTri(tri) {
        this.actifs.tri = tri;
    },

    /**
     * Réinitialiser tous les filtres
     */
    reinitialiser() {
        this.actifs.departements.clear();
        this.actifs.contrats.clear();
        this.actifs.periode = 'tout';
        this.actifs.motCle = '';
        this.actifs.recherche = '';
        this.actifs.tri = 'date';
    },

    /**
     * Appliquer tous les filtres actifs sur les offres
     */
    appliquerFiltres(offres) {
        let resultats = [...offres];

        // Filtre département
        if (this.actifs.departements.size > 0) {
            resultats = resultats.filter(o => this.actifs.departements.has(o.departement));
        }

        // Filtre contrat
        if (this.actifs.contrats.size > 0) {
            resultats = resultats.filter(o => this.actifs.contrats.has(o.typeContrat));
        }

        // Filtre période
        if (this.actifs.periode !== 'tout') {
            const maintenant = new Date();
            resultats = resultats.filter(o => {
                if (!o.datePublication) return true; // Inclure les offres sans date si un filtre période est actif
                const date = new Date(o.datePublication);
                const diffJours = (maintenant - date) / (1000 * 60 * 60 * 24);

                switch (this.actifs.periode) {
                    case 'aujourd-hui': return diffJours < 1;
                    case 'semaine': return diffJours <= 7;
                    case 'mois': return diffJours <= 30;
                    case 'ancien': return diffJours > 30;
                    default: return true;
                }
            });
        }

        // Filtre mot-clé source
        if (this.actifs.motCle) {
            resultats = resultats.filter(o => o.motCleSource === this.actifs.motCle);
        }

        // Recherche libre
        if (this.actifs.recherche) {
            const recherche = this.actifs.recherche;
            resultats = resultats.filter(o => {
                const texte = `${o.titre} ${o.entreprise} ${o.lieu} ${o.description}`.toLowerCase();
                return texte.includes(recherche);
            });
        }

        // Tri
        resultats = this.trier(resultats);

        return resultats;
    },

    /**
     * Trier les offres selon le critère actif
     */
    trier(offres) {
        const tri = this.actifs.tri;

        return [...offres].sort((a, b) => {
            switch (tri) {
                case 'date': {
                    const dateA = a.datePublication ? new Date(a.datePublication) : new Date(0);
                    const dateB = b.datePublication ? new Date(b.datePublication) : new Date(0);
                    return dateB - dateA; // Plus récent en premier
                }
                case 'fiabilite':
                    return (b.fiabilite || 0) - (a.fiabilite || 0);
                case 'pertinence': {
                    // Priorité aux offres du 49, puis par date
                    const scoreA = (a.departement === '49' ? 100 : 0) + (a.fiabilite || 0);
                    const scoreB = (b.departement === '49' ? 100 : 0) + (b.fiabilite || 0);
                    return scoreB - scoreA;
                }
                case 'entreprise':
                    return (a.entreprise || '').localeCompare(b.entreprise || '');
                default:
                    return 0;
            }
        });
    },

    /**
     * Calculer les compteurs par département
     */
    compteursDepartements(offres) {
        const compteurs = {};
        Object.keys(CONFIG.departements).forEach(d => { compteurs[d] = 0; });
        offres.forEach(o => {
            if (compteurs[o.departement] !== undefined) {
                compteurs[o.departement]++;
            }
        });
        return compteurs;
    },

    /**
     * Calculer les compteurs par type de contrat
     */
    compteursContrats(offres) {
        const compteurs = {};
        CONFIG.contratsAcceptes.forEach(c => { compteurs[c] = 0; });
        offres.forEach(o => {
            const code = o.typeContrat?.toUpperCase();
            if (compteurs[code] !== undefined) {
                compteurs[code]++;
            }
        });
        return compteurs;
    },

    /**
     * Calculer les compteurs par période
     */
    compteursPeriodes(offres) {
        const maintenant = new Date();
        const compteurs = { 'aujourd-hui': 0, 'semaine': 0, 'mois': 0, 'ancien': 0, 'tout': offres.length };

        offres.forEach(o => {
            if (!o.datePublication) return;
            const date = new Date(o.datePublication);
            const diffJours = (maintenant - date) / (1000 * 60 * 60 * 24);

            if (diffJours < 1) compteurs['aujourd-hui']++;
            if (diffJours <= 7) compteurs['semaine']++;
            if (diffJours <= 30) compteurs['mois']++;
            else compteurs['ancien']++;
        });

        return compteurs;
    },

    /**
     * Calculer les compteurs par mot-clé
     */
    compteursMotsCles(offres) {
        const compteurs = {};
        CONFIG.keywords.forEach(k => { compteurs[k] = 0; });
        offres.forEach(o => {
            if (compteurs[o.motCleSource] !== undefined) {
                compteurs[o.motCleSource]++;
            }
        });
        return compteurs;
    }
};
