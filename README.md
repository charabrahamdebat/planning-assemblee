# Planning Assemblée — V1

Application web Next.js + Supabase pour programmer les réunions d'une assemblée chrétienne en ligne.

## Périmètre de cette livraison

- Authentification du compte administrateur Supabase et contrôle de la table app_admins.
- Gestion des intervenants (nom, e-mail ou WhatsApp, activation/désactivation).
- Génération mensuelle des vendredis (22h00 à 01h00 le samedi) et dimanches (16h00 à 18h00).
- Vendredi : ouverture, méditation, intercession, louange et adoration.
- Dimanche : ouverture, prière, louange et adoration, prédication.
- Une même personne peut remplir plusieurs responsabilités.
- Affectations modifiables et horaires ajustables.
- Protection des données par RLS côté Supabase.

Les liens personnels, confirmations, demandes de modification, validations administrateur, envoi e-mail/WhatsApp et export PDF restent à développer. Aucun envoi n'est réalisé par cette version.

## Installation locale

Node.js 22 ou supérieur :

1. Cloner ce dépôt, puis lancer npm install dans son dossier.
2. Copier .env.example vers .env.local et renseigner NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
3. Récupérer la clé publishable dans Supabase, projet planning-assemblee, Project Settings > API Keys.
4. Lancer npm run dev puis ouvrir http://localhost:3000.
5. Se connecter avec l'utilisateur déjà créé dans Supabase Authentication > Users.

Ne jamais ajouter de clé service_role, sb_secret_* ou de mot de passe au dépôt, ni dans une variable NEXT_PUBLIC_*.
La base Supabase et ses 7 tables sont déjà créées : ne pas réexécuter le script initial.

Commandes de test : npm test, npm run typecheck, npm run build.

## Déploiement Vercel

Importer ce dépôt dans Vercel et configurer les variables d'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY avec leurs valeurs correspondantes. Ne pas publier sans avoir vérifié la connexion et les opérations RLS.

Cette livraison a passé les tests de logique calendaire, mais la compilation complète Next.js et le parcours navigateur restent à valider.
