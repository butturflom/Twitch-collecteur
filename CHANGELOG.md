# Journal des versions

Notes de chaque version du collecteur et du tableau de bord, de la plus ancienne à la plus récente. Le mode d'emploi est dans [LISEZMOI.md](LISEZMOI.md) ; pour l'état actuel des chantiers, voir [SUIVI.md](SUIVI.md).

## Ce que mesure la version 1.1

- **Emotes 7TV, BTTV et FFZ** : reconnues comme des emotes (listes rechargées toutes les heures, API Twitch nécessaire pour celles propres à chaque chaîne). Elles ne polluent plus les « mots ».
- **Type de chaque message** (onglet Chat) : réaction, vague (même message repris par 3 personnes ou plus en 15 s), vers le streamer (question, tutoiement, @, réponse), entre viewers (réponse ou @ à un autre viewer), commentaire (4 mots ou plus), court, commande. Seuls les compteurs sont envoyés, jamais le texte.
- **Participation** (vue d'ensemble) : pendant les lives, part des viewers qui écrivent chaque minute et messages par minute pour 1 000 viewers, pour comparer des chaînes de tailles différentes.

## Ce que mesure la version 1.2

Tout vient de l'API Twitch (Client ID et secret dans `config.json`), relevé toutes les 15 minutes.

- **Followers** (vue d'ensemble) : relevés chaque heure. Le tableau « Audience et followers » donne le rapport viewers ÷ followers et l'évolution par jour (dès 24 h de relevés).
- **Clips** (onglets Chat et Chaîne) : les meilleurs clips de chaque chaîne (jusqu'à 100 sur 7 jours au démarrage, puis sur 3 jours), placés sur la minute exacte du live grâce à leur position dans le replay. Le tableau compare le chat pendant chaque clip à sa normale des 20 minutes d'avant. Seuls le titre du clip et son nombre de vues sont gardés, jamais le pseudo de la personne qui l'a créé.
- **Pub déclarée** (« contenu de marque »), **labels de contenu** et **tags** : relevés à chaque changement. Le tableau « Avec ou sans pub déclarée » compare le chat d'une même chaîne dans les deux cas.
- **Réglages du chat** : mode lent, abonnés seulement, emotes seulement, messages uniques, followers seulement. Une pastille « chat limité » apparaît dans le tableau de participation quand un de ces modes a été actif, car il fait baisser les messages sans refléter l'envie d'écrire.

Ces états sont des valeurs « du moment » : l'historique commence à la mise à jour du collecteur, il n'existe pas pour avant. La comparaison des clips avec le chat n'est possible que sur les périodes où le collecteur a écouté (le détail minute par minute est gardé 14 jours).

Après une mise à jour du collecteur, exécute aussi `schema.sql` dans le SQL Editor de Supabase : il ajoute ce qui manque sans rien effacer.

## Ce qui change avec la version 1.3

- **Liste des chaînes protégée** : il faut le code du tableau de bord pour ajouter ou retirer une chaîne (voir plus haut).
- **Connexion au chat plus fiable** : après une mise en veille ou une coupure silencieuse, le collecteur s'en rend compte et se reconnecte (au plus tard 6 minutes sans rien recevoir). Un message de viewer contenant le mot « RECONNECT » ne coupe plus la connexion.
- **Taille de la base surveillée**, et présences gardées 21 jours au lieu de 60.

Après la mise à jour, exécute `schema.sql` dans le SQL Editor de Supabase, puis relance le collecteur.

**Version 1.3.1**

- **Rien n'est compté deux fois.** Chaque envoi porte un identifiant. Si la réponse de Supabase se perd, le collecteur renvoie le même lot, et la base l'ignore s'il était déjà enregistré.
- **Arrêt propre** : `desinstaller-demarrage.bat` demande au collecteur de s'arrêter (fichier `arreter.flag`) et lui laisse jusqu'à 20 s pour envoyer ses dernières données. Il ne force l'arrêt que s'il ne répond pas.
- **Rien ne se perd pendant une coupure.** Tant que l'envoi échoue, les données en attente sont recopiées dans `en-attente.json` toutes les 30 s. Un arrêt brutal (Gestionnaire des tâches, coupure de courant) ne fait donc perdre que les dernières secondes.
- **Une seule instance**, même si Windows lance le collecteur deux fois au même moment.

**Version 1.3.2**

- **Icône « Twitch Overlap »** sur le Bureau et dans le menu Démarrer : elle ouvre le tableau de bord et relance le collecteur s'il était arrêté. Si tu déplaces le dossier, relance `creer-raccourci.bat`.
- **Mode « Ce navigateur »** : les pseudos sont aussi remplacés par une empreinte, comme avec le collecteur. Les données enregistrées avant sont converties à l'ouverture de la page.
- **Heure de Paris partout** dans le tableau de bord, comme dans le collecteur, quel que soit le fuseau de l'ordinateur.
- **Bots** : un pseudo en « …bot » n'est écarté que s'il est modérateur ou VIP de la chaîne. Un viewer qui s'appelle « talbot » compte maintenant.
- **Participation et temps de stream** : les relevés en plus (ajout d'une chaîne, redémarrage) ne gonflent plus la durée de live.
- **Mots et emotes** envoyés toutes les 5 minutes au lieu de 30 secondes : la base s'encombre beaucoup moins. Ils apparaissent donc dans la page avec jusqu'à 5 minutes de décalage.
- **Ménage quotidien** : il n'est plus refait à chaque redémarrage du collecteur.

## Ce qui change avec la version 1.4

- **Périodes sans écoute grisées** : sur les courbes de messages et d'ambiance, les moments où le collecteur n'écoutait pas une chaîne (PC éteint ou en veille, chat coupé, chaîne pas encore ajoutée) apparaissent en gris. Avant, on ne pouvait pas distinguer un chat calme d'un collecteur arrêté. Survole la zone grise pour voir l'heure de début, l'heure de fin et la durée. Rien n'est grisé avant la mise à jour : l'historique d'écoute commence avec la 1.4. Les coupures de moins de 3 minutes sont ignorées.
- Le mode « Ce navigateur » enregistre aussi ses périodes d'écoute.

Après la mise à jour, exécute `schema.sql` dans le SQL Editor de Supabase (il ajoute la table `ecoute`), puis relance le collecteur.

**Version 1.4.1**

- **Arrêt brutal sans perte de mots ni d'emotes** : `en-attente.json` est maintenant mis à jour à chaque envoi (toutes les 30 s), pas seulement en cas de panne. Il contient aussi les mots et emotes retenus jusqu'à 5 min. Ce fichier est donc presque toujours présent : c'est normal.
- **Tableau de bord** : une chaîne n'apparaît plus « LIVE » quand le collecteur est arrêté (son statut n'est montré que s'il a moins de 3 min). Recliquer sur **Connecter**, cliquer sur **Tout effacer** ou changer de mode pendant une synchronisation ne fait plus perdre de données. « Messages écrits par le top 10 % » ne dépasse plus 100 % sur 30 jours. **Restaurer une sauvegarde** reprend aussi les mots, emotes, VOD, followers, clips et périodes d'écoute ; en mode collecteur, elle ne modifie plus la liste des chaînes suivies.
- **`desinstaller-demarrage.bat`** ne force l'arrêt que si le processus est bien le collecteur.
- **Liens VOD plus fiables** : si le replay d'un live n'est pas trouvé du premier coup (erreur réseau, replay pas encore créé), le collecteur réessaie toutes les 2 minutes pendant 30 minutes.
- **Minute coupée par un redémarrage** : les deux morceaux sont fusionnés (emotes les plus utilisées et jeu compris), dans la base comme en mode « Ce navigateur ».
- **Vue d'ensemble** : la ligne « viewers actifs / viewers » devient « ont écrit pendant ce live ». Elle compte seulement les viewers qui ont écrit depuis le début du live en cours, au lieu de tous ceux de la période choisie (qui pouvaient donner plus de 100 % sur 7 ou 30 jours). Un live commencé la veille compte aussi ceux qui ont écrit avant minuit.
- **Bouton « Ignorer »** (chaînes ajoutées en mode « Ce navigateur ») : il masque la suggestion sans retirer ces chaînes de la liste de ce mode.
- **Mode « Ce navigateur »** : ajouter une chaîne puis cliquer aussitôt sur **Arrêter** ne provoque plus d'erreur.

Après la mise à jour, exécute `schema.sql` dans le SQL Editor de Supabase (il met à jour la fonction `ingest`, sans rien effacer).

**Version 1.4.2** (tableau de bord seulement)

La **Carte** est refaite :

- **Les noms ne se chevauchent plus.** Chaque nom se place là où il y a de la place autour de son rond, sans toucher un autre nom, un autre rond, les boutons, le bandeau « RADAR » ou le logo du centre. Quand la place manque (surtout sur téléphone), le nom est masqué, une ligne sous la carte l'indique, et il réapparaît en zoomant ou au survol. Deux ronds ne se recouvrent plus jamais.
- **Plus lisible** : les chaînes qui partagent très peu de viewers ne sont plus repoussées au bord (ce qui tassait toutes les autres dans un coin) ; un trait entre deux chaînes du même groupe prend la couleur du groupe ; sur téléphone, la carte est plus haute que large pour laisser plus de place aux noms.
- **Navigation** :
  - **clic gauche glissé** : toute la carte tourne autour du centre du radar, 2,5 fois moins vite que la souris pour garder la main (l'angle s'affiche en haut à gauche) ;
  - **clic droit glissé sur une icône** : déplace cette chaîne. Sa place est gardée dans ce navigateur ; le bouton ↺ remet toutes les chaînes déplacées à leur place calculée ;
  - **clic droit glissé sur un espace vide** (ou bouton du milieu, ou flèches du clavier) : déplace la carte ;
  - **zoom** : Ctrl + molette (⌘ sur Mac), pincement ou boutons + et − ; double-clic sur un endroit pour zoomer, sur une chaîne pour ouvrir sa fiche ; ⤢ pour tout réafficher sans rotation ;
  - **sur téléphone** : un doigt fait tourner la carte, deux doigts zooment et la déplacent (déplacer une chaîne demande une souris) ;
  - la liste « Aller à une chaîne… » la centre sur la carte, et les boutons **Groupe 1**, **Groupe 2**… cadrent un groupe en estompant les autres ;
  - sous la carte, chaque carte « Groupe » a un bouton **Voir sur la carte**, et cliquer un nom de chaîne la sélectionne sur la carte ;
  - au clavier (carte sélectionnée) : flèches, + et −, 0 pour tout afficher, Échap pour désélectionner.
- **Clic sur une chaîne** : elle et ses voisines restent nettes, le reste s'estompe, et les liens affichent la part de ses viewers actifs qu'on voit aussi chez l'autre. Une fiche sous la carte donne ses 6 liens les plus forts (cliquables) et un bouton pour ouvrir sa page. Avant, un simple clic ouvrait la fiche de la chaîne.
- **Plus stable** : les chaînes ne bougent plus à chaque rafraîchissement, et la page ne redessine pas la carte pendant qu'on l'explore (2 minutes après le dernier geste). Le zoom et la chaîne choisie sont gardés.
- **Fond radar** aux couleurs de l'application : écran violet avec le logo Twitch au centre (pivot de la rotation), et un écho de la couleur du groupe qui passe d'une chaîne à l'autre en faisant le tour de la carte toutes les 10 secondes (pas d'écho si l'ordinateur est réglé pour réduire les animations).

**Chevauchement : viewers qui changent de stream**

- **Filtre « Viewers »** en haut de l'onglet : **Tous**, **Sur 2 chaînes ou plus**, **Changent de stream** (au moins une fois) ou **Changent souvent** (3 fois ou plus), avec le nombre de viewers concernés sur chaque bouton. Tout l'onglet (tableau, paires, répartition) est alors calculé sur ces viewers seulement. Le choix est gardé dans ce navigateur.
- Un **changement de stream** = la même personne écrit chez une chaîne, puis chez une autre moins de 3 h après. En 1.4.2, il était estimé à partir des présences ; depuis la 1.5, il est compté message par message (voir plus bas).
- Nouvelle section **Viewers qui changent de stream** : combien bougent, combien bougent souvent, le nombre de changements par viewer ; puis, chaîne par chaîne, la part de son chat qui bouge et où ces viewers partent et d'où ils arrivent le plus ; enfin **les parcours les plus nomades**, viewer par viewer (anonymes : seul le début de l'empreinte est affiché, jamais le pseudo).

Autres corrections du tableau de bord :

- **Groupe 1, Groupe 2…** cadrent bien tout le groupe même quand la carte est tournée, quitte à dézoomer un peu. Le groupe mis en avant reste le même après un rafraîchissement, même si les groupes changent de numéro.
- **Réglages → Données** : le texte dépend maintenant du mode. En mode collecteur, il indique que les données sont dans Supabase et donne leurs vraies durées de conservation (il disait « tout reste dans ce navigateur » et « 60 jours »).
- Si la carte s'affiche avant que la police de la page soit chargée, elle se redessine une fois la police prête, pour que les noms ne se touchent pas.

Pas de mise à jour du collecteur ni de `schema.sql` : recharge simplement la page.

## Ce qui change avec la version 1.5

- **Changements de stream comptés message par message.** Pour chaque viewer (son empreinte, jamais son pseudo), le collecteur retient la chaîne de son dernier message. Si son message suivant arrive dans une autre chaîne moins de 3 h après, c'est un changement de stream, compté par jour et par sens (de A vers B) dans une nouvelle table `switches`. Les allers-retours entre deux lives en même temps sont maintenant vus : avant, la base ne gardait que le premier et le dernier message de la journée sur chaque chaîne, et quelqu'un qui alternait entre deux chats dans la soirée comptait 0 changement.
- **Onglet Chevauchement** : le filtre **Changent de stream / Changent souvent**, le tableau chaîne par chaîne et les parcours les plus nomades utilisent ces comptes exacts. Les jours d'avant la mise à jour gardent l'estimation (une note sous les chiffres indique depuis quand le compte est exact). Le mode « Ce navigateur » compte de la même façon.
- L'onglet **Flux** ne change pas : il montre toujours les départs d'un chat vers un autre (quelqu'un qui finit d'écrire chez A puis va chez B), avec leur délai.
- La table `switches` est gardée aussi longtemps que les présences (`joursPresence`, 21 jours par défaut). Elle reste petite : seuls les viewers qui changent de stream y figurent.

Après la mise à jour, exécute `schema.sql` dans le SQL Editor de Supabase (il ajoute la table `switches` et met à jour `ingest` et `cleanup`, sans rien effacer), puis relance le collecteur. Un collecteur 1.4 continue de marcher avec la nouvelle base, et l'inverse aussi (les changements sont alors simplement ignorés).


## Ce qui change avec la version 1.6

- **Bans et timeouts comptés par chaîne.** Twitch annonce chaque sanction dans le chat (message `CLEARCHAT`), y compris aux connexions anonymes comme celle du collecteur. Le collecteur compte les **bans**, les **timeouts** et les **chats vidés** (`/clear`), regroupés par chaîne et par minute dans la table `events` (types `ban`, `timeout`, `clear` ; `n` = nombre de sanctions). Ni le pseudo sanctionné ni le modérateur ne sont gardés. Toutes les sanctions comptent, qu'elles viennent d'un modérateur, d'un bot ou d'AutoMod : Twitch ne dit pas qui les a données.
- **Tableau de bord** : nouvelle section **Modération du chat** dans la vue d'ensemble (bans, timeouts, chats vidés et sanctions pour 1 000 messages, chaîne par chaîne), et une tuile **bans et timeouts** sur la fiche de chaque chaîne. Le mode « Ce navigateur » les relève aussi.
- Le relevé commence à la mise à jour : rien n'apparaît pour les jours d'avant.

Pas de mise à jour de `schema.sql` : la table `events` existante suffit. Relance simplement le collecteur.

**Version 1.6.1**

- **Messages supprimés comptés par chaîne.** Quand un modérateur ou un bot supprime un message, Twitch l'annonce dans le chat (message `CLEARMSG`). Le collecteur les compte comme les sanctions, par chaîne et par minute, dans la table `events` (type `del`). Le texte du message supprimé et son auteur, que Twitch fournit, sont ignorés. Un message bloqué par AutoMod avant d'être affiché n'est pas annoncé, donc pas compté.
- **Tableau de bord** : colonnes **Messages supprimés** et **Supprimés pour 1 000 messages** dans la section « Modération du chat », et une tuile **messages supprimés** sur la fiche de chaque chaîne.

Pas de mise à jour de `schema.sql`. Relance simplement le collecteur.

**Version 1.6.2** (tableau de bord seulement)

- **Lives en premier** : dans la vue d'ensemble, l'onglet « Par chaîne » et l'onglet « Chat », les chaînes en live passent devant, de la plus regardée à la moins regardée. La fiche ouverte par défaut est celle de la chaîne la plus regardée en live, et les courbes de la vue d'ensemble montrent ces chaînes en priorité.
- **Filtre Langue** à côté de la période : **Toutes**, **Francophones**, **Anglophones** (et **Autres** s'il y a d'autres langues), avec le nombre de chaînes. Il s'applique à tous les onglets : totaux, cartes, tableaux, carte, chevauchement. Le choix est gardé dans ce navigateur. La langue est celle que le streamer déclare pour son stream sur Twitch, relevée par le collecteur avec l'état de la chaîne. Une pastille **FR** ou **EN** apparaît aussi à côté du nom de chaque chaîne.

- **« Ont écrit pendant ce live » ne dépasse plus 100 %** sur les longs lives : les viewers qui ont écrit depuis le début du live sont comparés à la moyenne des viewers de ce live, et non plus aux viewers du moment. Sur un marathon de 24 h dont l'audience a chuté (kaicenat, 135 %), le chiffre devient interprétable (24 %).

Pas de mise à jour du collecteur ni de `schema.sql` : recharge simplement la page.

**Version 1.6.3** (tableau de bord seulement)

- **Carte vivante** : la carte bat au rythme réel des chats. Toutes les 10 secondes, elle relit les 6 dernières minutes de la base, même quand elle ne se redessine pas :
  - une chaîne **pulse** (elle saute, s'éclaire et un anneau de la couleur de son groupe s'étend) quand son chat écrit. Plus il y a de messages, plus elle pulse, mais pas en proportion stricte, pour qu'une grosse chaîne ne cache pas les petites (5 pulsations par seconde au plus sur toute la carte) ;
  - **+1** s'envole quand quelqu'un écrit pour la première fois de la journée chez cette chaîne ;
  - une **lumière part vers une chaîne voisine** quand la pulsation vient de viewers qu'on voit aussi chez elle ;
  - **♥** pour un abonnement (ou un abonnement offert), **◆** pour des bits, **RAID** pour un raid, chacun montré une seule fois quand il arrive ;
  - le bandeau « RADAR » indique le nombre de messages par minute sur les chaînes de la carte, ou **CALME** s'il n'y en a pas : sans live en cours, la carte reste calme.
- Comme l'écho du radar, rien ne bouge si l'ordinateur est réglé pour réduire les animations. Quand une chaîne est choisie, l'activité des chaînes estompées est estompée aussi.

Pas de mise à jour du collecteur ni de `schema.sql` : recharge simplement la page.

**Version 1.6.4** (tableau de bord seulement)

- **Nouveaux liens sur la Carte** : ils sont courbes, bombés vers l'extérieur du radar, pour moins se croiser au centre. Chaque lien passe de la couleur du groupe d'une chaîne à celle de l'autre, ce qui fait ressortir les ponts entre deux groupes (avant, ces liens étaient gris), et il a un léger halo lumineux. Les pourcentages affichés sur les liens d'une chaîne choisie suivent la courbe.
- **Liens éclairés par l'activité** : la lumière qui part vers une chaîne voisine suit maintenant la courbe du lien, et le lien s'illumine sur son passage.
- **Tracé à l'apparition** : quand on ouvre l'onglet Carte ou qu'on change de période ou de langue, les liens se dessinent du centre du radar vers l'extérieur, puis leur halo s'allume (environ 2 secondes). Pas pendant les rafraîchissements automatiques, et pas si l'ordinateur est réglé pour réduire les animations.

Pas de mise à jour du collecteur ni de `schema.sql` : recharge simplement la page.

**Version 1.6.5** (tableau de bord seulement)

- **Carte plus lisible, disposée automatiquement** :
  - chaque groupe a sa zone autour du logo, et les groupes qui partagent le plus de viewers sont placés côte à côte ;
  - les chaînes se placent en comptant la place de leur nom, avec de l'air entre les groupes, et toute la surface de la carte est utilisée, en largeur comme en hauteur, sans passer sous le bandeau « RADAR », le logo ou les boutons ;
  - chaque groupe reste groupé, et les chaînes isolées se placent à côté de la chaîne avec qui elles partagent le plus ;
  - les liens forts sont plus courts que les faibles, et deux chaînes d'un même groupe échangent leur place quand ça évite des croisements ;
  - 4 dispositions sont calculées à partir de départs différents, et la plus lisible est gardée (environ 200 ms, une seule fois) ;
  - un lien qui sortirait de la carte se courbe vers l'intérieur.
  
  Sur une vraie carte de 52 chaînes : 89 % des voisins proches d'une chaîne sont de son groupe (environ 60 % avant), moins de liens qui se croisent, et aucun nom masqué.
- **Bouton « Réorganiser »** au-dessus de la carte : recalcule toute la disposition et revient à la vue d'ensemble. Les chaînes déplacées à la main (clic droit) reprennent aussi leur place calculée : un seul clic remet toute la carte en ordre. (↺ remet seulement les chaînes déplacées à leur place, sans recalculer le reste.)
- Toujours stable : la disposition ne dépend que des données. Mêmes chaînes et mêmes liens donnent le même dessin, et un rafraîchissement ne fait qu'un léger réajustement.

Pas de mise à jour du collecteur ni de `schema.sql` : recharge simplement la page.

**Version 1.6.6** (tableau de bord seulement)

- **Trois vues pour la Carte**, au-dessus de la carte :
  - **Toutes les chaînes** (vue principale, par défaut) : toutes les chaînes suivies qui ont au moins un viewer actif sur la période, sans groupes affichés. Les ronds et les liens sont d'une seule couleur (violet). Les chaînes qui partagent beaucoup de viewers restent rangées ensemble ;
  - **Groupes** : la carte d'avant, avec une couleur par groupe détecté, les boutons Groupe 1, Groupe 2… et la liste des groupes sous la carte (chaînes d'au moins 5 viewers actifs) ;
  - **Ma sélection** : seulement les chaînes que tu coches. « Choisir les chaînes… » ouvre la liste de toutes les chaînes suivies, avec une recherche, « Tout cocher » (seulement les chaînes trouvées par la recherche) et « Tout décocher ». La sélection est gardée dans ce navigateur, et elle ne dépend pas du filtre de langue.
- **Langue** : le filtre Langue en haut de la page (**Toutes**, **Francophones**, **Anglophones**) s'applique aux vues « Toutes les chaînes » et « Groupes ».
- **Groupes plus aérés** : la carte prend la hauteur de la fenêtre (de 660 à 860 px au lieu de 660 au plus). Sur une vraie carte de 52 chaînes, il y a 65 % d'espace en plus entre les groupes, autant de croisements et aucun nom masqué.
- Chaque vue garde sa propre disposition, et « Réorganiser » recalcule celle de la vue affichée.
- Les chaînes gardent toujours une marge autour du logo Twitch du centre.

Pas de mise à jour du collecteur ni de `schema.sql` : recharge simplement la page.

**Version 1.6.7** (tableau de bord seulement)

- **La Carte prend toute la page** : toute la largeur de la fenêtre et toute la hauteur sous les onglets. La page ne défile plus, et la carte suit la taille de la fenêtre.
- **Les chaînes occupent tout le cadre** : une fois la disposition calculée, elle est agrandie depuis le centre jusqu'aux bords (au plus 2 fois, et pas plus de 35 % de plus en largeur qu'en hauteur, pour garder la forme). Plus d'espace entre les chaînes, moins de noms masqués.
- **Menu des filtres à gauche** : tout ce qui règle la carte y est regroupé :
  - **Période** et **Langue** (les mêmes que les filtres du haut des autres onglets, qui sont masqués sur la Carte) ;
  - **Vue** : Toutes les chaînes, Groupes, Ma sélection ;
  - avec Ma sélection, la liste **Chaînes cochées** (recherche, Tout cocher, Tout décocher) ;
  - **Aller à une chaîne** ;
  - avec la vue Groupes, la liste des **groupes** et de leurs chaînes (clic sur un groupe : il est cadré sur la carte ; clic sur une chaîne : sa fiche s'ouvre) ;
  - **Réorganiser la carte** ;
  - l'**aide** (lire et manipuler la carte), repliée.
- Le bouton **«** replie le menu en une fine barre « ☰ Filtres » : la carte prend alors aussi cette place. Le choix est gardé dans ce navigateur. Sur téléphone, le menu est replié au départ et s'ouvre par-dessus la carte.
- La **fiche de la chaîne choisie** s'affiche par-dessus la carte, en bas à gauche (× ou Échap pour la fermer).
- **La molette zoome directement**, sans Ctrl, puisque la page ne défile plus.
- **Recentrer sur la sélection** : le bouton **◎** (sous ⤢, et dans la fiche de la chaîne choisie) ou la touche **C** ramène la chaîne choisie au centre de la carte, même tournée (zoom gardé, au moins 1,6). Sans chaîne choisie, il recadre le groupe mis en avant. Sans rien de choisi, il ramène le centre de la carte (le logo) au milieu de l'écran, en gardant le zoom et la rotation. Le bouton est toujours actif.

Pas de mise à jour du collecteur ni de `schema.sql` : recharge simplement la page.

**Version 1.6.8** (collecteur seulement)

- **Envois bloqués par un emoji coupé.** Le titre d'un clip était coupé à 100 caractères, parfois au milieu d'un emoji. La moitié d'emoji restante rendait le lot refusé par Supabase (erreur `PGRST102 « Empty or invalid json »`), et comme le collecteur renvoie le même lot jusqu'à ce qu'il passe, plus rien n'était envoyé : tout s'accumulait dans `en-attente.json`. Les titres sont maintenant coupés sans casser d'emoji, et tout texte envoyé est remis en forme avant l'envoi (une moitié d'emoji isolée devient « � »). Le lot bloqué part au redémarrage, rien n'est perdu.
- **Gros lots envoyés en morceaux.** Après un blocage, ou quand de nouvelles chaînes arrivent avec tous leurs clips d'un coup, un lot pouvait compter des dizaines de milliers de lignes et dépasser le temps maximal d'une requête Supabase (erreur `57014 « statement timeout »`), puis être refusé à chaque essai. Il part maintenant en morceaux de 2 000 lignes au plus, chacun avec son propre identifiant : un morceau déjà enregistré n'est jamais compté deux fois.

Pas de mise à jour de `schema.sql` ni du tableau de bord. Relance simplement le collecteur.

**Version 1.6.9** (collecteur seulement)

- **Alerte quand les envois échouent.** Après **3 envois de suite refusés ou impossibles** (environ 1 min 30), le collecteur affiche une **notification Windows** : « Twitch Overlap : envois bloqués », avec depuis quand et la cause. Tant que ça dure, un rappel revient **toutes les 30 minutes**. Quand les envois repartent, une notification « envois rétablis » le confirme. Les données restent gardées sur le PC pendant ce temps (`en-attente.json`). Chaque alerte est aussi notée dans `collecteur.log`.
- Pour couper ces notifications, ajoute `"alertes": false` dans `config.json`.
- Si le collecteur lui-même est arrêté, il ne peut pas prévenir : c'est le tableau de bord qui l'indique (« Collecteur hors ligne depuis… »).

Pas de mise à jour de `schema.sql` ni du tableau de bord. Relance simplement le collecteur.

**Version 1.6.10** (collecteur et tableau de bord)

- **Envois bloqués par certains mots du chat.** Un mot comme « constructor » ou « toString » existe déjà dans tout objet JavaScript : le compteur de mots produisait alors « function Object() { [native code] }1 » au lieu d'un nombre, et Supabase refusait le lot (erreur `22P02 « invalid input syntax for type bigint »`). Les compteurs du collecteur et du tableau de bord ne se trompent plus sur ces mots, et un lot déjà abîmé est réparé à l'envoi (le mot retrouve son vrai compte).

Relance le collecteur et recharge le tableau de bord. Pas de mise à jour de `schema.sql`.

**Version 1.6.11** (collecteur, tableau de bord et base)

- **Historique court pour tenir dans l'offre gratuite.** Avec 86 chaînes, les viewers actifs ajoutent jusqu'à environ 19 Mo par heure aux heures de pointe : 500 Mo ne tiennent qu'environ 2 jours. Réglages dans `config.json` :
  - `joursPresence` : 1 (aujourd'hui et hier) ;
  - `joursDetailMinute` : 2 ;
  - `joursEvenements` : 2 (nouveau ; 60 par défaut) ;
  - `joursReleves` : 2 (nouveau, relevés de viewers ; 30 par défaut).
  Les périodes « 7 jours » et « 30 jours » du tableau de bord ne montrent donc que ces 2 jours.
- **Ménage toutes les heures** au lieu d'une fois par jour, pour que la base ne gonfle pas d'une journée entière entre deux ménages. Il n'est noté qu'une fois par jour dans `collecteur.log`.
- **Base** : la fonction `cleanup` accepte deux durées de plus (`days_events`, `days_snaps`). Déjà appliqué sur ta base ; `schema.sql` est à jour pour une nouvelle installation.
- **Tableau de bord** : sa copie locale suit les mêmes durées, et l'onglet Réglages les affiche.
- Une fois supprimées, les lignes ne font pas baisser tout de suite la taille annoncée par Supabase : la place libérée est réutilisée pour les nouvelles données.

Relance le collecteur et recharge le tableau de bord.

## Tableau de bord 2.0.0 (25/11/2026)

Rien à changer côté collecteur (version 1.6.13). **Rejoue `schema.sql` en entier dans le SQL Editor de Supabase** : il ajoute deux fonctions de lecture, `channel_stickiness` (fidélité du chat) et `channels_rhythm` (alertes de rythme). Rien n'est supprimé.

- **Page d'accueil** au premier chargement ; le bouton « Explorer l'observatoire » l'écarte pour de bon. `?accueil` à la fin de l'adresse la rouvre.
- **Barre latérale en quatre groupes** : Observatoire (Carte, Vue d'ensemble), Analyse et flux, Exploration, Configuration.
- **Par chaîne** : en tête, 5 indicateurs ; « Communauté et événements » se déplie au clic. Nouveau bloc **Son univers** (voisines, rang par taille, chaînes juste au-dessus). Dans **Historique**, la **fidélité du chat** : sur 100, la part des viewers actifs qui n'ont écrit chez aucune autre chaîne suivie juste après. Elle se compare aux chaînes de taille voisine ; en dessous de 200 viewers actifs, elle est donnée comme fragile.
- **Vue d'ensemble** : bloc **Rythme des chaînes** (celles qui décollent ou ralentissent). Il faut 14 journées agrégées : il le dit tant qu'elles manquent.
- **Rosters** : **Comparer des chaînes**, 2 à 4 côte à côte, avec l'audience nette du groupe et les viewers en commun.
- **Carte** : filtre **Jeu principal** à côté de la langue.
- **Ambiance spatiale** : un ciel étoilé discret derrière toutes les pages sauf la Carte, des panneaux « console » (légèrement translucides, halo violet très doux), des avatars en petites planètes et, en tête de **Recoupements**, une constellation des paires les plus proches. Aucun chiffre ne change.

## Tableau de bord 2.0.0 (26/11/2026)

Rien à changer côté collecteur (version 1.6.13). **Rejoue `schema.sql` en entier dans le SQL Editor de Supabase** : il ajoute la fonction de lecture `flows_by_day` (carte des migrations). Rien n'est supprimé. Si tu construis le tableau de bord toi-même, lance `npm install` dans `app/` avant `npm run build` (nouvelle dépendance `three`).

- **Intro animée** de 4 secondes avant la page d'accueil, une seule fois par navigateur. « Passer l'intro », Échap ou un clic la passent ; elle ne joue pas si les mouvements réduits sont activés. `?accueil` la rejoue.
- **Page d'accueil** : « viewers actifs » est défini (ceux qui écrivent dans le chat), le bouton principal s'appelle « Ouvrir le tableau de bord », meilleur affichage étroit et clavier. L'écran « Les données n'arrivent pas » propose de la revoir.
- **Planètes peintes** : chaque chaîne est une planète au motif propre à son nom, à la place de sa photo ; un anneau marque les 3 chaînes les plus fortes de la vue. Sur la Carte, les couleurs peuvent différer d'avant.
- **Flux** : à côté du Sankey, une **carte des migrations** montre les passages de viewers actifs jour par jour (elle n'apparaît que si la base est à jour). Le Sankey occupe toute la largeur.
- **Chiffres plus justes** : la fidélité du chat ne s'affiche qu'à partir de 200 viewers actifs ; « Écrivent aussi chez » donne un pourcentage à partir de 30 viewers ; la croissance est la médiane calculée sur les followers (« — » sous 100 followers au départ).
- **Rapport mensuel des agences** : même seuil de fidélité que le tableau de bord (200 viewers actifs, « — » en dessous). La mention « score fragile » et la colonne CSV « Fidélité fragile » disparaissent.
- **Textes** : l'onglet Rosters n'affiche plus son titre deux fois et tutoie comme le reste ; « 1 000 » ne se coupe plus sur deux lignes dans Par chaîne.

## Tableau de bord 2.0.1 (26/11/2026)

Rien à changer côté collecteur (version 1.6.13), `schema.sql` n'est pas à rejouer.

- **Ajouter un streamer** : la recherche des Réglages ne partait jamais et affichait toujours « Recherche API Twitch non configurée ». Elle part maintenant toute seule pendant la frappe. Sans API dans le navigateur, on peut ajouter un pseudo exact ou une adresse `twitch.tv/…` ; les chaînes déjà suivies sont marquées « Suivie ».
- **API Twitch** : la section a de nouveau les champs Client ID et Client secret, et permet de générer un nouveau jeton quand l'ancien expire.
- Le bouton « Ajouter un streamer » de la barre latérale ouvre la recherche et y place le curseur.

## Tableau de bord 2.0.2 (26/11/2026)

Rien à changer côté collecteur (version 1.6.13), `schema.sql` n'est pas à rejouer.

- **Chaînes suivies** : la liste entière s'affiche, avec un filtre. Chaque chaîne peut être retirée, après confirmation ; ses données déjà collectées restent.
- **Ajouter plusieurs** : colle une liste de pseudos ou d'adresses. Rien n'est retiré ; les pseudos invalides et ceux au-delà de la limite de 100 sont signalés et restent dans le champ.
- **Résultats de recherche** (avec l'API Twitch) : viewers en direct, langue quand Twitch la donne, chaînes en direct d'abord après le pseudo exact. Les flèches parcourent les résultats.

## Tableau de bord 2.0.3 (26/11/2026)

Rien à changer côté collecteur (version 1.6.13), `schema.sql` n'est pas à rejouer.

- **Réglages, « Elles ont raidé tes chaînes »** : les chaînes non suivies qui ont envoyé des raids aux chaînes suivies sur 30 jours, classées par viewers envoyés, avec le nombre de raids, les chaînes visées et un bouton « Ajouter ». Il faut au moins 2 raids ou 20 viewers. Demande la base Supabase du collecteur.
- Un même raid enregistré deux fois à moins d'une minute n'est compté qu'une fois dans ce bloc.
- À 100 chaînes, la page le dit et rappelle d'en retirer une avant d'ajouter.

## Tableau de bord 2.0.4 (27/11/2026)

Rien à changer côté collecteur (version 1.6.13), `schema.sql` n’est pas à rejouer.

- **Les raids s’affichent de nouveau** avec la source « Collecteur 24h/24 » : « Dernier raid » de la Vue d’ensemble, Flux, Par chaîne et communautés investies. Le tableau les cherchait dans la table `events`, alors que le collecteur les écrit dans `raid_events`.
- Les raids encore en base sur 60 jours sont rechargés au premier lancement. Un même raid enregistré deux fois à moins d’une minute n’est compté qu’une fois.
- Flux : « Organiques » et « Raids » deviennent « Sans raid » et « Trajets raidés ». Ces deux chiffres comptent des migrations, pas des viewers de raid, et un trajet qui a connu un raid sur la période y est rangé en entier.

## Tableau de bord 2.0.5 (27/11/2026)

Rien à changer côté collecteur (version 1.6.13), `schema.sql` n’est pas à rejouer. Détail des calculs dans `CALCULS.md`. **Plusieurs chiffres changent**, parce que les anciens étaient faux ou mélangés.

- **Heures de stream** : les pauses entre deux lives ne comptent plus (environ trois fois moins en base).
- **« Tout », 7 et 30 jours** : tous les chiffres portent sur les mêmes jours, à partir du moment où messages, viewers et viewers actifs sont tous disponibles. La mention « N h de données », qui additionnait les durées de tous les viewers, est retirée.
- **Migrations** : une seule source, le compte du collecteur, sur toutes les pages. Un nombre = des personnes distinctes sur un trajet.
- **Raids** : plus de part « due aux raids » en nombres ; les trajets qui ont eu un raid portent la mention « raid ». Le filtre Organique / Raids de Flux est retiré.
- **Communautés investies** : classées par la part des viewers qui écrivent chaque minute, puis les messages pour 1 000 viewers (au moins 50 viewers en moyenne). Les raids ne sont plus additionnés aux subs.
- **Part en commun** : partout, la part des viewers actifs de la première chaîne aussi vus chez la seconde.

## Tableau de bord 2.0.6 (27/11/2026)

Rien à changer côté collecteur (version 1.6.13). **`schema.sql` est à rejouer** pour que la correction prenne effet.

- **Fidélité du chat** : un viewer parti vers deux chaînes ne compte plus deux fois. La base garde chaque nuit le nombre de partants distincts (colonne `leavers` de `daily_streamer_rollup`).
- Les journées agrégées avant l’ajout gardent l’ancienne estimation ; l’écran dit combien. Sans `schema.sql` rejoué, rien ne change et l’écran le dit.

## Tableau de bord 2.0.7 (27/11/2026)

Rien à changer côté collecteur (version 1.6.13), `schema.sql` n'est pas à rejouer.

- **La Carte montre le direct** : seules les chaînes en direct sont affichées, et la taille d'une planète suit leurs viewers en ce moment.
- **Hors ligne sur demande** (Menu, Statut, « Avec les hors ligne ») : petites planètes éteintes.
- **Plus de période sur la Carte** : les traits, les groupes, les étoiles et les passages portent sur tout le détail gardé ; la date de début est écrite dans le bandeau, la légende et l'aide.
- **Filtres sur le direct** : « Jeu en cours » (le jeu du live) et « Audience minimale » (50, 200 ou 1 000 viewers en direct).
- Moins de 3 chaînes en direct : la Carte le dit et propose d'afficher les hors ligne.

## Tableau de bord 2.0.8 (27/11/2026)

Rien à changer côté collecteur (version 1.6.13), `schema.sql` n'est pas à rejouer.

- **« Aujourd'hui » par défaut.** Les blocs qui demandent plusieurs jours gardent leur échelle : historique, rythme, fidélité du chat, carte des migrations (toutes ses journées), « Viewers actifs fidèles » et « Avec ou sans pub » (tout le détail gardé, c'est écrit).
- **Viewers max** : à la place des viewers dans les cartes et les lignes de « Les chaînes » et dans les indicateurs de « Par chaîne ».
- **Bandeau des raids reçus** en tête de la Vue d'ensemble : pause au survol, au clavier ou au bouton, fixe si les mouvements sont réduits. Aucun raid aujourd'hui : les derniers relevés, et il le dit.
- **Recoupements** : la constellation passe au-dessus de la phrase, centrée.
- **Nouvel onglet Clip** : moments à clipper et clips, retirés de Chat et de Par chaîne (un lien y mène).
- **Par chaîne** : types de messages et ambiance de la chaîne, jeux en pastilles.
- **Chat** : les 3 emotes les plus utilisées en podium ; les tableaux chaîne par chaîne sont repliés.
- **Vue d'ensemble** : 5 chaînes hors ligne affichées, le reste à dérouler (la liste entière s'affichait malgré le bouton).
- **Par jeu** : « Trouver des streamers par catégorie » est retiré (l'ajout reste dans les Réglages).
- **Réglages** : nombre de chaînes suivies et limite de 100 en grand, avec une jauge.
- **Carte** : la légende quitte le dessin et passe dans l'aide (« ? », onglet « Lire »).

## Tableau de bord 2.0.9 (27/11/2026)

Rien à changer côté collecteur (version 1.6.13). **`schema.sql` est à rejouer** : avant cela, les viewers actifs et le pic des journées passées affichent « — », et la page le dit.

- **Onglet « Audiences »** à la place de « Chevauchement » et « Flux » : une page, « En commun » puis « Qui va où ». Il ne porte que sur les chaînes suivies et affichées, tout comme les trajets du rapport PDF et CSV.
- **Chaînes retirées** : leurs données encore en base ne comptent plus dans les autres onglets ni dans le rapport (avant, elles comptaient sans filtre de langue) ; les journées passées de « Jour par jour » les gardent.
- **Carte des migrations** animée, journée en cours comprise. Le diagramme de flux (Sankey) est supprimé.
- **Paires** rangées sur le pourcentage affiché ; **« Chaîne par chaîne »** en un seul tableau.
- **Retirés** : « Changements par viewer qui bouge » (médiane, maximum), la colonne « Souvent », « Partent surtout vers » et « Arrivent surtout de ».
- **Vue d'ensemble** : l'activité de la période en tête (nombres annoncés par Twitch, puis le chat) ; « Jour par jour » (pic de viewers et viewers actifs séparés, 7, 30 ou 90 jours) remplace « Historique du réseau » ; bandeau des raids remonté ; « En ce moment » (« Les jeux du moment », « Les streamers montants ») au-dessus des chaînes.
- **Retirés avec « Historique du réseau »** : l'audience moyenne cumulée et sa courbe, le total des messages sur 30 et 90 jours.
- **Base** : nouvelle table `daily_network_rollup` (pic simultané par jour, non purgée) ; `network_history` renvoie aussi les viewers actifs, le pic et son heure. Le pic ne se remplit que si `joursReleves` vaut au moins 2.

## Tableau de bord 2.0.10 (27/11/2026)

Rien à changer côté collecteur (version 1.6.13). **`schema.sql` est à rejouer** pour l’historique des lives : avant cela, la page le dit, et le bloc du jour marche quand même.

- **« Live du jour »** en tête de « Par chaîne » : viewers max (avec son heure), début et fin, viewers moyens, minimum après les 10 premières minutes, durée et jeux en pastilles. Les lives qui touchent aujourd’hui, même commencés la veille ; plusieurs lives le même jour, avec leur total ; sans live aujourd’hui, il le dit et montre le dernier connu. La période choisie ne le filtre pas.
- **Ce qui n’est pas observé est écrit** : « Premier relevé » quand le début n’a pas été vu, « fin non observée » quand le collecteur s’est interrompu.
- **Lives précédents** (30 jours) dans une liste repliée sous le bloc.
- **Sur « Aujourd’hui »**, la case « Viewers max » et le bloc « Jeux streamés » laissent leur place à ce bloc ; ils reviennent sur les autres périodes.
- **Base** : historique des lives (table `lives`, fonction `channel_lives`), rempli chaque nuit, non purgé.
