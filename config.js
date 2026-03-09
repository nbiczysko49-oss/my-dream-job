/**
 * config.js - Configuration centralisée de l'application My Dream Job
 * Contient les mots-clés, départements, URLs des plateformes et paramètres globaux
 */

const CONFIG = {
    // Informations de l'application
    app: {
        name: 'My Dream Job',
        version: '1.0.0',
        alertEmail: 'cleoler49@gmail.com',
        refreshInterval: 60 * 60 * 1000, // 60 minutes en millisecondes
    },

    // Mots-clés de recherche (7 termes simultanés)
    keywords: [
        'communication',
        'marketing',
        'community management',
        'création graphique',
        'communication digitale',
        'social media',
        'gestion de site internet'
    ],

    // Départements de la région Pays de la Loire
    departements: {
        '44': { nom: 'Loire-Atlantique', ville: 'Nantes', prioritaire: false },
        '49': { nom: 'Maine-et-Loire', ville: 'Angers', prioritaire: true },
        '53': { nom: 'Mayenne', ville: 'Laval', prioritaire: false },
        '72': { nom: 'Sarthe', ville: 'Le Mans', prioritaire: false },
        '85': { nom: 'Vendée', ville: 'La Roche-sur-Yon', prioritaire: false }
    },

    // Types de contrats acceptés
    contratsAcceptes: ['CDI', 'CDD', 'MIS', 'LIB', 'SAI'],
    contratsLabels: {
        'CDI': 'CDI',
        'CDD': 'CDD',
        'MIS': 'Intérimaire',
        'LIB': 'Freelance',
        'SAI': 'Saisonnier'
    },

    // Termes à exclure (alternance, stage)
    termesExclus: ['alternance', 'stage', 'apprentissage', 'apprenti', 'alternant'],

    // API France Travail
    franceTravail: {
        tokenUrl: 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
        searchUrl: 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search',
        scope: 'api_offresdemploiv2 o2dsoffre',
        clientId: '', // Sera saisi par l'utilisateur
        clientSecret: '', // Sera saisi par l'utilisateur
    },

    // API OpenAI
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        maxTokens: 1500,
        temperature: 0.7,
    },

    // Liens directs vers les plateformes d'emploi (pré-filtrés Pays de la Loire + mots-clés)
    plateformes: [
        {
            nom: 'LinkedIn Jobs',
            icone: '💼',
            couleur: '#0077b5',
            url: 'https://www.linkedin.com/jobs/search/?keywords=communication+marketing+%22community+management%22&location=Pays+de+la+Loire%2C+France&f_TPR=r86400',
            description: 'Offres LinkedIn Pays de la Loire'
        },
        {
            nom: 'Indeed France',
            icone: '🔍',
            couleur: '#003a9b',
            url: 'https://fr.indeed.com/emplois?q=communication+marketing+%22community+management%22&l=Pays+de+la+Loire&fromage=7',
            description: 'Offres Indeed Pays de la Loire'
        },
        {
            nom: 'Welcome to the Jungle',
            icone: '🌿',
            couleur: '#14b789',
            url: 'https://www.welcometothejungle.com/fr/jobs?query=communication+marketing&aroundQuery=Pays+de+la+Loire%2C+France',
            description: 'Offres WTTJ Pays de la Loire'
        },
        {
            nom: 'France Travail',
            icone: '🏛️',
            couleur: '#003189',
            url: 'https://candidat.francetravail.fr/offres/recherche?motsCles=communication+marketing&lieuTravail=44%2C49%2C53%2C72%2C85&typeContrat=CDI%2CCDD',
            description: 'Offres France Travail Pays de la Loire'
        },
        {
            nom: 'Apec',
            icone: '🎯',
            couleur: '#e4002b',
            url: 'https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=communication+marketing&lieuTravail=pays-de-la-loire',
            description: 'Offres APEC cadres Pays de la Loire'
        },
        {
            nom: 'Cadremploi',
            icone: '👔',
            couleur: '#f97316',
            url: 'https://www.cadremploi.fr/emploi/liste_offres.html?kw=communication+marketing&lc=Pays+de+la+Loire',
            description: 'Offres Cadremploi Pays de la Loire'
        },
        {
            nom: 'HelloWork',
            icone: '👋',
            couleur: '#7c3aed',
            url: 'https://www.hellowork.com/fr-fr/emploi/recherche.html?k=communication+marketing&l=Pays+de+la+Loire&c=CDI%2CCDD',
            description: 'Offres HelloWork Pays de la Loire'
        },
        {
            nom: 'Google Jobs',
            icone: '🔎',
            couleur: '#4285f4',
            url: 'https://www.google.com/search?q=offre+emploi+communication+marketing+%22Pays+de+la+Loire%22+CDI+CDD&ibp=htl;jobs',
            description: 'Offres via Google Jobs'
        }
    ],

    // Clés localStorage
    storage: {
        franceTravailClientId: 'mdj_ft_client_id',
        franceTravailClientSecret: 'mdj_ft_client_secret',
        franceTravailToken: 'mdj_ft_token',
        franceTravailTokenExpiry: 'mdj_ft_token_expiry',
        openaiKey: 'mdj_openai_key',
        theme: 'mdj_theme',
        offresVues: 'mdj_offres_vues',
        lastRefresh: 'mdj_last_refresh',
        configDone: 'mdj_config_done'
    },

    // Couleurs des badges de contrat
    badgesContrat: {
        'CDI': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
        'CDD': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
        'MIS': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
        'LIB': { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },
        'SAI': { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' }
    }
};

// Export pour utilisation dans les autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
