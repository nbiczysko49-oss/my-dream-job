/**
 * ai-advisor.js - Conseil IA pour postuler à une offre d'emploi
 * Utilise l'API OpenAI (gpt-4o-mini) pour fournir des conseils personnalisés
 */

const AI_ADVISOR = {
    // État du modal
    _offreEnCours: null,

    /**
     * Initialiser le conseiller IA
     */
    init() {
        // Créer le modal IA dans le DOM
        this._creerModal();
        this._attacherEvenements();
    },

    /**
     * Créer le modal d'analyse IA
     */
    _creerModal() {
        if (document.getElementById('modal-ia')) return;

        const modal = document.createElement('div');
        modal.id = 'modal-ia';
        modal.className = 'modal-ia';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-ia-titre');
        modal.innerHTML = `
            <div class="modal-ia-overlay" id="modal-ia-overlay"></div>
            <div class="modal-ia-content">
                <div class="modal-ia-header">
                    <div class="modal-ia-titre-wrap">
                        <span class="modal-ia-icone">✨</span>
                        <h2 id="modal-ia-titre">Analyse IA de l'offre</h2>
                    </div>
                    <button class="modal-ia-fermer" id="modal-ia-fermer" aria-label="Fermer">✕</button>
                </div>

                <div class="modal-ia-offre" id="modal-ia-offre-info">
                    <!-- Infos de l'offre -->
                </div>

                <div class="modal-ia-corps" id="modal-ia-corps">
                    <div class="modal-ia-chargement" id="modal-ia-chargement">
                        <div class="spinner-ia"></div>
                        <p>Analyse de l'offre en cours...</p>
                        <small>Le modèle IA examine les données réelles de l'offre pour vous donner des conseils personnalisés.</small>
                    </div>
                    <div class="modal-ia-resultat" id="modal-ia-resultat" style="display:none;">
                        <!-- Résultats de l'IA -->
                    </div>
                    <div class="modal-ia-erreur" id="modal-ia-erreur" style="display:none;">
                        <!-- Message d'erreur -->
                    </div>
                </div>

                <div class="modal-ia-footer">
                    <small class="modal-ia-note">⚠️ Ces conseils sont générés par IA et basés uniquement sur les données réelles de l'offre.</small>
                    <button class="btn-copier" id="btn-copier-analyse" style="display:none;">📋 Copier l'analyse</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Attacher les événements du modal
     */
    _attacherEvenements() {
        document.addEventListener('click', e => {
            if (e.target.id === 'modal-ia-fermer' ||
                e.target.id === 'modal-ia-overlay') {
                this.fermerModal();
            }
            if (e.target.id === 'btn-copier-analyse') {
                this.copierAnalyse();
            }
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && document.getElementById('modal-ia')?.classList.contains('ouvert')) {
                this.fermerModal();
            }
        });
    },

    /**
     * Ouvrir le modal et lancer l'analyse pour une offre
     */
    async analyser(offreId) {
        const offre = window.APP?._offresAffichees?.find(o => o.id === offreId) ||
                      window.APP?._offres?.find(o => o.id === offreId);

        if (!offre) {
            NOTIFICATIONS.afficherToast('Offre introuvable', 'error');
            return;
        }

        // Vérifier la clé API OpenAI
        const apiKey = localStorage.getItem(CONFIG.storage.openaiKey);
        if (!apiKey) {
            this._demanderCleOpenAI(offre);
            return;
        }

        this._offreEnCours = offre;
        this.ouvrirModal(offre);
        await this.lancerAnalyse(offre);
    },

    /**
     * Demander la clé API OpenAI si non configurée — ouvre la modale de configuration
     */
    _demanderCleOpenAI(offre) {
        // Ouvrir la modal de configuration principale pour saisir la clé OpenAI
        NOTIFICATIONS.afficherToast(
            '🔑 Entrez votre clé API OpenAI dans les paramètres pour activer l\'analyse IA.',
            'info',
            5000
        );
        APP._afficherModalConfig();
    },

    /**
     * Ouvrir le modal IA
     */
    ouvrirModal(offre) {
        const modal = document.getElementById('modal-ia');
        if (!modal) return;

        // Afficher les infos de l'offre
        const offreInfo = document.getElementById('modal-ia-offre-info');
        if (offreInfo) {
            offreInfo.innerHTML = `
                <div class="modal-offre-titre">${this._echapper(offre.titre)}</div>
                <div class="modal-offre-meta">
                    <span>🏢 ${this._echapper(offre.entreprise)}</span>
                    <span>📍 ${this._echapper(offre.lieu)}</span>
                    <span class="badge-contrat badge-${offre.typeContrat}">${CONFIG.contratsLabels[offre.typeContrat] || offre.typeContrat}</span>
                </div>
            `;
        }

        // Réinitialiser le corps
        const chargement = document.getElementById('modal-ia-chargement');
        const resultat = document.getElementById('modal-ia-resultat');
        const erreur = document.getElementById('modal-ia-erreur');
        const btnCopier = document.getElementById('btn-copier-analyse');

        if (chargement) chargement.style.display = 'block';
        if (resultat) { resultat.style.display = 'none'; resultat.innerHTML = ''; }
        if (erreur) { erreur.style.display = 'none'; erreur.innerHTML = ''; }
        if (btnCopier) btnCopier.style.display = 'none';

        modal.classList.add('ouvert');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Fermer le modal IA
     */
    fermerModal() {
        const modal = document.getElementById('modal-ia');
        if (modal) {
            modal.classList.remove('ouvert');
            document.body.style.overflow = '';
        }
        this._offreEnCours = null;
    },

    /**
     * Lancer l'analyse IA de l'offre
     */
    async lancerAnalyse(offre) {
        try {
            const analyse = await API.analyserAvecIA(offre);
            this.afficherResultat(analyse);
        } catch (e) {
            this.afficherErreur(e.message);
        }
    },

    /**
     * Afficher les résultats de l'analyse
     */
    afficherResultat(texte) {
        const chargement = document.getElementById('modal-ia-chargement');
        const resultat = document.getElementById('modal-ia-resultat');
        const btnCopier = document.getElementById('btn-copier-analyse');

        if (chargement) chargement.style.display = 'none';

        if (resultat) {
            resultat.style.display = 'block';
            resultat.innerHTML = this._formaterTexteIA(texte);
        }

        if (btnCopier) btnCopier.style.display = 'inline-flex';
    },

    /**
     * Afficher un message d'erreur
     */
    afficherErreur(message) {
        const chargement = document.getElementById('modal-ia-chargement');
        const erreur = document.getElementById('modal-ia-erreur');

        if (chargement) chargement.style.display = 'none';

        if (erreur) {
            erreur.style.display = 'block';
            erreur.innerHTML = `
                <div class="ia-erreur-icone">⚠️</div>
                <div class="ia-erreur-message">
                    <strong>Erreur lors de l'analyse IA</strong>
                    <p>${this._echapper(message)}</p>
                    ${message.includes('quota') || message.includes('billing') ?
                        '<p class="ia-erreur-aide">💡 Vérifiez votre crédit OpenAI sur <a href="https://platform.openai.com/usage" target="_blank">platform.openai.com</a></p>' :
                        message.includes('401') || message.includes('Unauthorized') ?
                        '<p class="ia-erreur-aide">💡 Vérifiez votre clé API OpenAI dans les paramètres ⚙️</p>' :
                        '<p class="ia-erreur-aide">💡 Vérifiez votre connexion internet et réessayez.</p>'
                    }
                </div>
                <button class="btn-reessayer" onclick="AI_ADVISOR.lancerAnalyse(AI_ADVISOR._offreEnCours)">
                    🔄 Réessayer
                </button>
            `;
        }
    },

    /**
     * Formater le texte de l'IA en HTML structuré
     */
    _formaterTexteIA(texte) {
        if (!texte) return '<p>Aucune analyse disponible.</p>';

        // Convertir le markdown basique en HTML
        let html = this._echapper(texte);

        // Titres avec **
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Sections numérotées
        html = html.replace(/^(\d+)\.\s+(<strong>[^<]+<\/strong>)/gm, '<h4 class="ia-section">$1. $2</h4>');

        // Listes avec -
        html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="ia-liste">$&</ul>');

        // Sauts de ligne
        html = html.replace(/\n{2,}/g, '</p><p class="ia-para">');
        html = html.replace(/\n/g, '<br>');

        // Emojis de section
        html = html.replace(/(🎯|✉️|💡|❓|⭐)/g, '<span class="ia-emoji">$1</span>');

        return `<div class="ia-contenu"><p class="ia-para">${html}</p></div>`;
    },

    /**
     * Copier l'analyse dans le presse-papiers
     */
    async copierAnalyse() {
        const resultat = document.getElementById('modal-ia-resultat');
        if (!resultat) return;

        const texte = resultat.innerText || resultat.textContent;
        try {
            await navigator.clipboard.writeText(texte);
            NOTIFICATIONS.afficherToast('📋 Analyse copiée dans le presse-papiers !', 'success');
        } catch (e) {
            NOTIFICATIONS.afficherToast('Impossible de copier', 'error');
        }
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
    }
};
