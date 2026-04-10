import os
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'servesewa-fallback-secret-123')

# Database Configuration (Vercel Compatibility)
if os.environ.get('VERCEL'):
    # Vercel has a read-only filesystem except for /tmp
    db_path = '/tmp/invoices.db'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///invoices.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_no = db.Column(db.String(50), nullable=False)
    customer_name = db.Column(db.String(200), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    data_json = db.Column(db.Text, nullable=False) # Store full JSON of items
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Auth Decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password')
            
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/save_invoice', methods=['POST'])
@login_required
def save_invoice():
    data = request.json
    try:
        new_invoice = Invoice(
            invoice_no=data.get('invoice_no'),
            customer_name=data.get('customer_name'),
            date=data.get('date'),
            total_amount=float(data.get('total_amount')),
            data_json=json.dumps(data)
        )
        db.session.add(new_invoice)
        db.session.commit()
        return jsonify({"status": "success", "message": "Invoice saved successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/history')
@login_required
def history():
    invoices = Invoice.query.order_by(Invoice.created_at.desc()).all()
    return render_template('history.html', invoices=invoices)

# Initialize DB and create default user
def init_db():
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username='admin').first():
            hashed_pw = generate_password_hash('password123')
            admin = User(username='admin', password=hashed_pw)
            db.session.add(admin)
            db.session.commit()
            print("Default admin user created: admin / password123")

# This ensures the DB is initialized even on Vercel's serverless functions
init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
