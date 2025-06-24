from flask import Blueprint, render_template, request, redirect, url_for, session, flash
import os
import secrets
import pam

auth_bp = Blueprint('auth', __name__)

# PAM initialisation
PAM_AVAILABLE = True
p = None
try:
    p = pam.pam()
except ImportError:
    PAM_AVAILABLE = False

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if PAM_AVAILABLE and p:
            if p.authenticate(username, password):
                session["logged_in"] = True
                session["username"] = username
                next_url = request.args.get("next")
                return redirect(next_url or url_for("index"))
            else:
                flash("Nom utilisateur ou mot de passe incorrect.", "error")
        else:
            # Mode sans PAM (debug ou fallback)
            session["logged_in"] = True
            session["username"] = username
            next_url = request.args.get("next")
            return redirect(next_url or url_for("index"))
    return render_template("login.html")

@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))
    
# Vérification du mot de passe pour l'utilisateur connecté
def verify(password: str) -> bool:
    if not PAM_AVAILABLE or not p:
        return False
    username = session.get("username")
    if not username:
        return False
    return p.authenticate(username, password)


