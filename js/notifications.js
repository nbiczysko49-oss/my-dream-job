/**
 * notifications.js - Système d'alertes pour le département 49 (Angers/Maine-et-Loire)
 * Gère les notifications visuelles et le panneau d'alertes
 */

const NOTIFICATIONS = {
    // Offres Angers déjà notifiées
    _offresNotifiees: new Set(),

    // Son de notification (optionnel)
    _sonActive: false,

    /**
     * Initialiser le système de notifications
     */
    init() {
        // Charger les IDs déjà notifiés depuis le localStorage
        const vues = localStorage.getItem(CONFIG.storage.offresVues);
        if (vues) {
            try {
                JSON.parse(vues).forEach(id => this._offresNotifiees.add(id));
            } catch (e) {
                console.warn('Erreur chargement offres vues:', e);
            }
        }
    },

    /**
     * Vérifier les nouvelles offres Angers et déclencher les alertes
     */
    verifierNouvellesOffres(offres) {
        const offresAngers = offres.filter(o => o.departement === '49');
        const nouvelles = offresAngers.filter(o => !this._offresNotifiees.has(o.id));

        if (nouvelles.length > 0) {
            this.afficherAlerte(nouvelles);
            nouvelles.forEach(o => this._offresNotifiees.add(o.id));
            this._sauvegarderOffresVues();
        }

        this.mettreAJourPanneauAlertes(offresAngers, nouvelles.length);
        return nouvelles;
    },

    /**
     * Sauvegarder les IDs vus en localStorage
     * On limite à 500 entrées pour éviter de saturer le localStorage (quota ~5MB selon navigateur)
     */
    _sauvegarderOffresVues() {
        const ids = Array.from(this._offresNotifiees).slice(-500);
        localStorage.setItem(CONFIG.storage.offresVues, JSON.stringify(ids));
    },

    /**
     * Afficher une alerte visuelle pour les nouvelles offres Angers
     */
    afficherAlerte(nouvelles) {
        // Badge animé sur le compteur Angers
        const badge = document.getElementById('badge-angers');
        if (badge) {
            badge.textContent = nouvelles.length;
            badge.style.display = 'inline-flex';
            badge.classList.add('pulse');
            setTimeout(() => badge.classList.remove('pulse'), 3000);
        }

        // Toast de notification
        this.afficherToast(
            `🔔 ${nouvelles.length} nouvelle(s) offre(s) à Angers !`,
            'success',
            5000
        );

        // Mettre à jour le panneau d'alertes
        const mentionEmail = document.getElementById('mention-email');
        if (mentionEmail) {
            mentionEmail.style.display = 'block';
            mentionEmail.innerHTML = `📧 Alerte envoyée à ${CONFIG.app.alertEmail}`;
        }

        // Son optionnel (si activé par l'utilisateur)
        if (this._sonActive) {
            this._jouerSon();
        }
    },

    /**
     * Afficher un toast de notification
     */
    afficherToast(message, type = 'info', duree = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;

        container.appendChild(toast);

        // Animation d'entrée
        requestAnimationFrame(() => toast.classList.add('visible'));

        // Auto-suppression
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, duree);
    },

    /**
     * Mettre à jour le panneau d'alertes Angers dans la sidebar
     */
    mettreAJourPanneauAlertes(offresAngers, nbNouvelles) {
        // Compteur
        const compteur = document.getElementById('compteur-angers');
        if (compteur) {
            compteur.textContent = offresAngers.length;
        }

        // Panneau d'alertes
        const panneau = document.getElementById('panneau-alertes');
        if (!panneau) return;

        if (offresAngers.length === 0) {
            panneau.innerHTML = `
                <div class="alerte-vide">
                    <span class="alerte-vide-icone">🔍</span>
                    <p>Aucune offre pour Angers pour le moment</p>
                </div>
            `;
            return;
        }

        // Afficher les 5 dernières offres Angers
        const dernieres = offresAngers.slice(0, 5);
        panneau.innerHTML = dernieres.map(offre => `
            <div class="alerte-item ${offre.departement === '49' ? 'angers' : ''}" data-id="${offre.id}">
                <div class="alerte-header">
                    <span class="alerte-badge">🔔</span>
                    <strong class="alerte-titre">${this._echapper(offre.titre)}</strong>
                </div>
                <div class="alerte-meta">
                    <span>🏢 ${this._echapper(offre.entreprise)}</span>
                    <span>📅 ${this._formaterDate(offre.datePublication)}</span>
                </div>
                <div class="alerte-contrat">
                    <span class="badge-contrat badge-${offre.typeContrat}">${CONFIG.contratsLabels[offre.typeContrat] || offre.typeContrat}</span>
                </div>
                <a href="${offre.url}" target="_blank" rel="noopener noreferrer" class="alerte-lien">
                    Voir l'offre →
                </a>
            </div>
        `).join('');

        if (nbNouvelles > 0) {
            panneau.insertAdjacentHTML('afterbegin', `
                <div class="alerte-nouvelle">
                    🆕 ${nbNouvelles} nouvelle(s) offre(s) détectée(s) !
                    <br><small>📧 Alerte envoyée à ${CONFIG.app.alertEmail}</small>
                </div>
            `);
        }
    },

    /**
     * Jouer un son de notification discret
     */
    _jouerSon() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            // Son non disponible, ignorer
        }
    },

    /**
     * Activer/désactiver le son
     */
    toggleSon() {
        this._sonActive = !this._sonActive;
        return this._sonActive;
    },

    /**
     * Formater une date en français
     */
    _formaterDate(dateStr) {
        if (!dateStr) return 'Date inconnue';
        try {
            const date = new Date(dateStr);
            const maintenant = new Date();
            const diffMs = maintenant - date;
            const diffH = Math.floor(diffMs / (1000 * 60 * 60));
            const diffJ = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffH < 1) return "Il y a moins d'1h";
            if (diffH < 24) return `Il y a ${diffH}h`;
            if (diffJ === 1) return 'Hier';
            if (diffJ <= 7) return `Il y a ${diffJ} jours`;
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        } catch (e) {
            return 'Date inconnue';
        }
    },

    /**
     * Échapper le HTML pour éviter les injections
     */
    _echapper(texte) {
        if (!texte) return '';
        return texte
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
