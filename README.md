# ✨ My Dream Job

> Agrégateur d'offres d'emploi en temps réel pour la région **Pays de la Loire** (communication, marketing, digital)

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Déployable-blue?logo=github)](https://pages.github.com/)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla%20JS-yellow?logo=javascript)](https://developer.mozilla.org/fr/docs/Web/JavaScript)
[![API France Travail](https://img.shields.io/badge/API-France%20Travail-003189)](https://francetravail.io)
[![OpenAI](https://img.shields.io/badge/IA-OpenAI%20gpt--4o--mini-412991)](https://platform.openai.com)

---

## 🚀 Présentation

**My Dream Job** est une application web 100 % front-end (site statique, zéro backend) qui agrège et affiche des offres d'emploi en temps réel dans les **5 départements des Pays de la Loire** :

| Code | Département | Ville principale |
|------|-------------|-----------------|
| 44 | Loire-Atlantique | Nantes |
| **49** | **Maine-et-Loire** | **Angers** *(zone prioritaire)*|
| 53 | Mayenne | Laval |
| 72 | Sarthe | Le Mans |
| 85 | Vendée | La Roche-sur-Yon |

Elle recherche automatiquement les offres contenant ces **7 mots-clés** :
- communication
- marketing
- community management
- création graphique
- communication digitale
- social media
- gestion de site internet

---

## ✅ Fonctionnalités

### 🔍 Agrégation multi-sources
- **API France Travail** (anciennement Pôle Emploi) — offres récupérées en temps réel
- **Liens directs pré-filtrés** vers : LinkedIn Jobs, Indeed, Welcome to the Jungle, Apec, Cadremploi, HelloWork, Google Jobs

### 🗂️ Filtrage automatique
- ✅ Contrats acceptés : CDI, CDD, Freelance, Intérimaire
- 🚫 Exclusion automatique : alternance, stage, apprentissage
- 📍 Zones : 44, 49, 53, 72, 85 uniquement

### 📊 Informations affichées par offre
Chaque carte affiche (uniquement les données réelles, sans invention) :
- Titre du poste
- Entreprise
- Lieu (ville + département)
- Date de publication
- Type de contrat (badge coloré)
- Salaire (si disponible)
- Mode de travail (présentiel / télétravail / hybride)
- Expérience requise
- Source avec logo
- Missions principales extraites de la description
- Description complète (expandable)
- **Indice de fiabilité** (0–100%)
- **Lien cliquable** vers l'offre originale
- **Badge 🔔 Angers** pour les offres du 49

### ⏱️ Actualisation automatique
- Timer de **60 minutes** avec compte à rebours visible dans le header
- Bouton **"🔄 Actualiser maintenant"** pour forcer une mise à jour
- Indication visuelle (barre de progression + spinner) pendant le chargement

### 🔔 Alertes Angers (49)
- Panneau dédié dans la sidebar pour les offres du Maine-et-Loire
- Notification visuelle immédiate (toast animé)
- Badge distinctif sur chaque offre angevine
- Mention : *"📧 Alerte envoyée à cleoler49@gmail.com"*
- Compteur d'offres Angers en temps réel

### ✨ Analyse IA (OpenAI)
- Bouton **"✨ Analyser avec l'IA"** sur chaque offre
- Conseils personnalisés générés par `gpt-4o-mini` :
  1. Points forts à mettre en avant dans le CV
  2. Conseils pour la lettre de motivation
  3. Compétences clés à démontrer
  4. Questions probables en entretien
  5. Conseils pour se démarquer
- **Basé uniquement sur les données réelles de l'offre** (pas d'invention)

### 🎨 Design & UX
- Design moderne (palette bleu foncé #1a237e + accents dorés)
- **Mode sombre/clair** (toggle dans le header)
- **100% responsive** (desktop, tablette, mobile)
- Animations fluides (transitions CSS)
- Police Inter (Google Fonts)

---

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| Front-end | HTML5, CSS3, JavaScript (Vanilla) |
| Styles | CSS Custom Properties, CSS Grid/Flexbox |
| API emploi | [France Travail API v2](https://francetravail.io/data/api/offres-emploi) |
| IA | [OpenAI API](https://platform.openai.com) — gpt-4o-mini |
| Hébergement | GitHub Pages (statique) |
| Dépendances | Aucune (zéro framework, zéro build step) |

---

## 📁 Architecture des fichiers

```
my-dream-job/
├── index.html              # Page principale SPA
├── config.js               # Configuration centralisée
├── css/
│   └── style.css           # Styles (design moderne, responsive, dark/light)
├── js/
│   ├── app.js              # Logique principale, orchestration
│   ├── api.js              # Intégration API France Travail + OpenAI
│   ├── filters.js          # Filtrage et tri des offres
│   ├── notifications.js    # Alertes Angers (49)
│   └── ai-advisor.js       # Analyse IA (modal + appels OpenAI)
└── README.md               # Cette documentation
```

---

## 🔑 Obtenir les clés API

### API France Travail (obligatoire pour les offres)

1. Rendez-vous sur [francetravail.io](https://francetravail.io/data/api/offres-emploi)
2. Créez un compte partenaire (gratuit)
3. Créez une nouvelle application et souscrivez à **"Offres d'emploi v2"**
4. Notez votre **Client ID** et **Client Secret**
5. Dans l'application, cliquez sur ⚙️ **Paramètres** et entrez vos identifiants

> 💡 **Scope nécessaire** : `api_offresdemploiv2 o2dsoffre`

### API OpenAI (optionnel — pour l'analyse IA)

1. Créez un compte sur [platform.openai.com](https://platform.openai.com)
2. Allez dans **API Keys** > **Create new secret key**
3. Copiez la clé (commence par `sk-`)
4. Dans l'application, entrez la clé dans ⚙️ **Paramètres**

> 💡 Le modèle `gpt-4o-mini` est très économique (~0.001€ par analyse)

---

## 🚀 Déploiement sur GitHub Pages

### Méthode 1 : Interface GitHub

1. Allez dans votre repository > **Settings** > **Pages**
2. Dans **Source**, sélectionnez `Deploy from a branch`
3. Choisissez la branche `main` et le dossier `/ (root)`
4. Cliquez **Save**
5. Votre application sera disponible sur : `https://[votre-username].github.io/my-dream-job/`

### Méthode 2 : Utilisation locale

```bash
# Cloner le repository
git clone https://github.com/[votre-username]/my-dream-job.git
cd my-dream-job

# Ouvrir directement dans le navigateur
# (aucun serveur nécessaire, tout fonctionne en local)
open index.html
```

> ⚠️ Pour les appels API Cross-Origin, GitHub Pages est recommandé car certains navigateurs bloquent les requêtes depuis `file://`. Vous pouvez aussi utiliser un serveur local simple : `python3 -m http.server 8080`

---

## ⚙️ Configuration avancée

Le fichier `config.js` permet de personnaliser :
- **Mots-clés** (`CONFIG.keywords`) — les 7 termes de recherche
- **Départements** (`CONFIG.departements`) — zones géographiques
- **Contrats acceptés** (`CONFIG.contratsAcceptes`)
- **Termes exclus** (`CONFIG.termesExclus`) — alternance, stage, etc.
- **Interval d'actualisation** (`CONFIG.app.refreshInterval`) — en millisecondes

---

## ⚠️ Limitations connues

1. **Emails réels** : L'envoi d'email à `cleoler49@gmail.com` est simulé visuellement (badge + mention). Un vrai envoi nécessiterait un backend (ex : EmailJS, Netlify Functions).

2. **LinkedIn / Indeed** : Ces plateformes n'ont pas d'API publique. L'application génère des **liens de recherche directs pré-filtrés** qui s'ouvrent dans un nouvel onglet — c'est la seule approche légale possible côté client.

3. **Quota API** : L'API France Travail est gratuite mais limitée en débit. En cas d'erreur 429, attendez quelques minutes avant de relancer.

4. **CORS** : Les appels API nécessitent d'être servis depuis un domaine (pas `file://`). Utilisez GitHub Pages ou un serveur local.

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour proposer une amélioration :
1. Forkez le repository
2. Créez une branche : `git checkout -b feature/ma-fonctionnalite`
3. Committez : `git commit -m "feat: description"`
4. Ouvrez une Pull Request

---

## 📄 Licence

MIT — Libre d'utilisation, de modification et de distribution.

---

*Développé avec ❤️ pour la région Pays de la Loire*