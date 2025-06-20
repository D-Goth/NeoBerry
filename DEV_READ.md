🛠️ DEV_READ.md — Notes techniques NeoBerry

📦 **Dépendance obsolète** : `pkg_resources`

🔍 **Contexte**  
Gunicorn utilise encore `pkg_resources` (issu de `setuptools`) dans son fichier `util.py`, ce qui déclenche un avertissement lors du lancement :  

> UserWarning: pkg_resources est déprécié en tant qu'API. Voir https://setuptools.pypa.io/en/latest/pkg_resources.html.  
> Le paquet pkg_resources est prévu pour être supprimé dès le 30 novembre 2025.

📅 **Dates clés**  
- 2023-11-30 : Annonce officielle de la dépréciation de `pkg_resources` par la Python Packaging Authority  
- 2025-11-30 : Date cible de suppression définitive de `pkg_resources` dans `setuptools`  
- 2024-06-20 : Dernière vérification — Gunicorn utilise toujours `pkg_resources` (voir issue #2840 sur GitHub)

📦 **Paquet concerné**  
- `gunicorn` (actuellement testé avec la version 21.2.0)  
- Dépendance indirecte : `setuptools`

🧩 **Solution envisagée**  
- Attendre la mise à jour officielle de Gunicorn vers `importlib.metadata`  
- En attendant, ignorer l'avertissement ou forcer `setuptools<81` via :  

```bash
pip3 install "setuptools<81"
```

🧪 **Statut**  
Aucune régression fonctionnelle constatée. L'avertissement est purement informatif.

---

🛠️ DEV_READ.md — NeoBerry Technical Notes

📦 **Obsolete Dependency**: `pkg_resources`

🔍 **Context**  
Gunicorn still uses `pkg_resources` (from `setuptools`) in its `util.py` file, triggering a warning during launch:  

> UserWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html.  
> The pkg_resources package is slated for removal as early as 2025-11-30.

📅 **Key Dates**  
- 2023-11-30: Official announcement of `pkg_resources` deprecation by the Python Packaging Authority  
- 2025-11-30: Target date for the definitive removal of `pkg_resources` in `setuptools`  
- 2024-06-20: Last check — Gunicorn still uses `pkg_resources` (see issue #2840 on GitHub)

📦 **Affected Package**  
- `gunicorn` (currently tested with version 21.2.0)  
- Indirect dependency: `setuptools`

🧩 **Proposed Solution**  
- Wait for the official Gunicorn update to use `importlib.metadata`  
- In the meantime, ignore the warning or force `setuptools<81` via:  

```bash
pip3 install "setuptools<81"
```

🧪 **Status**  
No functional regressions observed. The warning is purely informational.
