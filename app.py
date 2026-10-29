from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
import PyPDF2
import re
import time
from database import get_db_connection, init_db
from werkzeug.utils import secure_filename
import recommendation
import os
import json

app = Flask(__name__)
app.secret_key = 'super_secret_safe_intern_key'

UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Database and Recommendation Engine on startup
if not os.path.exists('safeintern.db'):
    init_db()

# Auto-migrate columns if missing
try:
    conn = get_db_connection()
    # Student additions
    col_check_s = conn.execute("PRAGMA table_info(students)").fetchall()
    cols_s = [c[1] for c in col_check_s]
    if 'profile_picture' not in cols_s: conn.execute("ALTER TABLE students ADD COLUMN profile_picture TEXT DEFAULT ''")
    if 'contact_no' not in cols_s: conn.execute("ALTER TABLE students ADD COLUMN contact_no TEXT DEFAULT ''")
    
    # Company additions
    col_check_c = conn.execute("PRAGMA table_info(companies)").fetchall()
    cols_c = [c[1] for c in col_check_c]
    if 'profile_picture' not in cols_c: conn.execute("ALTER TABLE companies ADD COLUMN profile_picture TEXT DEFAULT ''")
    if 'linkedin_url' not in cols_c: conn.execute("ALTER TABLE companies ADD COLUMN linkedin_url TEXT DEFAULT ''")
    if 'website_url' not in cols_c: conn.execute("ALTER TABLE companies ADD COLUMN website_url TEXT DEFAULT ''")
    if 'gallery_images' not in cols_c: conn.execute("ALTER TABLE companies ADD COLUMN gallery_images TEXT DEFAULT '[]'")
    
    conn.commit()
    conn.close()
except Exception as e:
    print(f"Migration Error: {e}")

# Ensure student_internships and added_internships migration
try:
    conn = get_db_connection()
    # student_internships
    conn.execute('''
        CREATE TABLE IF NOT EXISTS student_internships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            internship_title TEXT,
            company_name TEXT,
            status TEXT CHECK(status IN ('upcoming', 'active', 'completed')),
            start_date TEXT,
            FOREIGN KEY(student_id) REFERENCES students(id)
        )
    ''')
    
    # added_internships columns check
    col_check_i = conn.execute("PRAGMA table_info(added_internships)").fetchall()
    cols_i = [c[1] for c in col_check_i]
    if 'start_date' not in cols_i: conn.execute("ALTER TABLE added_internships ADD COLUMN start_date TEXT DEFAULT ''")
    if 'end_date' not in cols_i: conn.execute("ALTER TABLE added_internships ADD COLUMN end_date TEXT DEFAULT ''")
    if 'last_date' not in cols_i: conn.execute("ALTER TABLE added_internships ADD COLUMN last_date TEXT DEFAULT ''")
    if 'status' not in cols_i: conn.execute("ALTER TABLE added_internships ADD COLUMN status TEXT DEFAULT 'active'")
    
    # Verification Requests Table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS verification_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            reg_name TEXT,
            license_no TEXT,
            country TEXT,
            certificate_path TEXT,
            status TEXT DEFAULT 'pending',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies (id)
        )
    ''')

    # Applications Table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            internship_id INTEGER,
            status TEXT DEFAULT 'Approval Pending' CHECK(status IN ('Approval Pending', 'Approved', 'Denied')),
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(internship_id) REFERENCES added_internships(id)
        )
    ''')
    
    conn.commit()

    conn.close()
except Exception as e:
    print(f"Database Migration Error: {e}")

try:
    recommendation.load_data()
except Exception as e:
    print(f"Error loading data for recommendations: {e}")

# ---------- ROUTES: HTML PAGES ----------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/student')
def student_dashboard():
    if 'student_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('student.html')

@app.route('/company')
def company_dashboard():
    if 'company_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('company.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/<path:filename>')
def serve_root_images(filename):
    allowed_files = ['logo.png', 'home image.png', 'image_home_-removebg-preview.png']
    if filename in allowed_files:
        return send_from_directory('.', filename)
    return "Not Found", 404

# ---------- ROUTES: APIs ----------

@app.route('/api/register/student', methods=['POST'])
def register_student():
    data = request.json or {}
    fullname = (data.get('fullname') or '').strip()
    email = (data.get('email') or '').strip()
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    contact_no = (data.get('contactNo') or '').strip()

    if not fullname or not email or not username or not password:
        return jsonify({'success': False, 'message': 'Please fill in all required fields.'})

    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''
            INSERT INTO students (full_name, email_id, contact_no, username, password)
            VALUES (?, ?, ?, ?, ?)
        ''', (fullname, email, contact_no, username, password))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Student registered successfully!'})
    except Exception as e:
        err_msg = str(e)
        if 'UNIQUE constraint failed' in err_msg:
            if 'username' in err_msg:
                return jsonify({'success': False, 'message': 'Username already exists. Please choose a different username.'})
            elif 'email_id' in err_msg:
                return jsonify({'success': False, 'message': 'Email address already registered. Please use a different email.'})
            return jsonify({'success': False, 'message': 'Account with this Email or Username already exists.'})
        return jsonify({'success': False, 'message': err_msg})

@app.route('/api/login/student', methods=['POST'])
def login_student():
    data = request.json or {}
    username = data.get('username', '')
    password = data.get('password', '')

    conn = get_db_connection()
    c = conn.cursor()
    student = c.execute('SELECT * FROM students WHERE username = ? AND password = ?', (username, password)).fetchone()
    conn.close()
    
    if student:
        session['student_id'] = student['id']
        session['student_name'] = student['full_name']
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'})

@app.route('/api/register/company', methods=['POST'])
def register_company():
    data = request.json or {}
    company_name = (data.get('companyName') or '').strip()
    email = (data.get('email') or '').strip()
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    contact_no = (data.get('contactNo') or '').strip()

    if not company_name or not email or not username or not password:
        return jsonify({'success': False, 'message': 'Please fill in all required fields.'})

    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''
            INSERT INTO companies (company_name, email_id, contact_no, username, password)
            VALUES (?, ?, ?, ?, ?)
        ''', (company_name, email, contact_no, username, password))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Company registered successfully!'})
    except Exception as e:
        err_msg = str(e)
        if 'UNIQUE constraint failed' in err_msg:
            if 'username' in err_msg:
                return jsonify({'success': False, 'message': 'Username already exists. Please choose a different username.'})
            elif 'email_id' in err_msg:
                return jsonify({'success': False, 'message': 'Email address already registered. Please use a different email.'})
            return jsonify({'success': False, 'message': 'Account with this Email or Username already exists.'})
        return jsonify({'success': False, 'message': err_msg})

@app.route('/api/login/company', methods=['POST'])
def login_company():
    data = request.json
    conn = get_db_connection()
    c = conn.cursor()
    company = c.execute('SELECT * FROM companies WHERE username = ? AND password = ?', (data['username'], data['password'])).fetchone()
    conn.close()
    
    if company:
        session['company_id'] = company['id']
        session['company_name'] = company['company_name']
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'})

@app.route('/api/student/profile', methods=['GET', 'POST'])
def handle_student_profile():
    if 'student_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    student_id = session['student_id']
    conn = get_db_connection()
    c = conn.cursor()
    
    if request.method == 'GET':
        student = c.execute('SELECT * FROM students WHERE id = ?', (student_id,)).fetchone()
        conn.close()
        # Convert row to dict, handling edge case if profile_picture is missing in older select statements
        student_dict = dict(student)
        if 'profile_picture' not in student_dict:
            student_dict['profile_picture'] = ''
        return jsonify(student_dict)
        
    elif request.method == 'POST':
        data = request.json
        c.execute('''
            UPDATE students SET
                full_name = ?, age = ?, gender = ?, education = ?,
                address = ?, skills = ?, linkedin_link = ?, github_link = ?
            WHERE id = ?
        ''', (
            data.get('full_name'), data.get('age'), data.get('gender'), 
            data.get('education'), data.get('address'), data.get('skills'),
            data.get('linkedin_link'), data.get('github_link'), student_id
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Profile updated successfully'})

@app.route('/api/student/upload_picture', methods=['POST'])
def upload_picture():
    if 'student_id' not in session:
        return jsonify({'success': False}), 401
        
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'})
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'})
        
    if file:
        filename = secure_filename(f"user_{session['student_id']}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        pic_url = f"/static/uploads/{filename}"
        conn = get_db_connection()
        conn.execute('UPDATE students SET profile_picture = ? WHERE id = ?', (pic_url, session['student_id']))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'profile_picture': pic_url})

def extract_cv_details(text):
    data = {}
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if lines and len(lines[0].split()) <= 4:
        data['full_name'] = lines[0]
        
    email_match = re.search(r'[\w\.-]+@[\w\.-]+', text)
    if email_match: data['email_id'] = email_match.group(0)
        
    age_match = re.search(r'\b(age|Age)[\s:-]+(\d{2})\b', text)
    if age_match: data['age'] = int(age_match.group(2))
    
    if re.search(r'\b(Male|male)\b', text): data['gender'] = 'Male'
    elif re.search(r'\b(Female|female)\b', text): data['gender'] = 'Female'
    
    edu_match = re.search(r'(Education|Degree|B\.Tech|BSc|BA|Master|B\.E)[\s:-]+(.*?)(?=\n\n|\n[A-Z]|$)', text, re.IGNORECASE)
    if edu_match: data['education'] = edu_match.group(2).strip()

    addr_match = re.search(r'(Address|Location)[\s:-]+(.*?)(?=\n|\||$)', text, re.IGNORECASE)
    if addr_match: data['address'] = addr_match.group(2).strip()
    
    common_skills = ['Python', 'Java', 'C++', 'JavaScript', 'HTML', 'CSS', 'Machine Learning', 'AI', 'SQL', 'NLP', 'Data Science', 'React', 'Node']
    found_skills = [s for s in common_skills if s.lower() in text.lower()]
    if found_skills:
        data['skills'] = ','.join(found_skills)
        
    return data

@app.route('/api/student/upload_cv', methods=['POST'])
def upload_cv():
    if 'student_id' not in session: return jsonify({'success': False}), 401
    if 'file' not in request.files: return jsonify({'success': False, 'message':'No file uploaded'})
    
    file = request.files['file']
    if not file.filename.endswith('.pdf'):
        return jsonify({'success': False, 'message': 'Only PDF supported currently'})
        
    try:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        extracted_data = extract_cv_details(text)
        return jsonify({'success': True, 'extracted_data': extracted_data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/company/profile', methods=['GET', 'POST'])
def handle_company_profile():
    if 'company_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    company_id = session['company_id']
    conn = get_db_connection()
    c = conn.cursor()
    
    if request.method == 'GET':
        company = c.execute('SELECT * FROM companies WHERE id = ?', (company_id,)).fetchone()
        conn.close()
        d = dict(company)
        if 'profile_picture' not in d: d['profile_picture'] = ''
        return jsonify(d)
        
    elif request.method == 'POST':
        data = request.json
        c.execute('''
            UPDATE companies SET
                company_name = ?, email_id = ?, contact_no = ?, 
                location = ?, linkedin_url = ?, website_url = ?
            WHERE id = ?
        ''', (
            data.get('company_name'), data.get('email_id'), data.get('contact_no'),
            data.get('location'), data.get('linkedin_url'), data.get('website_url'),
            company_id
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Profile updated successfully'})

@app.route('/api/company/upload_gallery', methods=['POST'])
def upload_company_gallery():
    if 'company_id' not in session: return jsonify({'success': False}), 401
    if 'file' not in request.files: return jsonify({'success': False, 'message': 'No file part'})
    
    file = request.files['file']
    if file.filename == '': return jsonify({'success': False, 'message': 'No file selected'})
    
    if file:
        import time
        filename = secure_filename(f"gallery_{session['company_id']}_{int(time.time())}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        pic_url = f"/static/uploads/{filename}"
        conn = get_db_connection()
        company = conn.execute('SELECT gallery_images FROM companies WHERE id = ?', (session['company_id'],)).fetchone()
        
        import json
        gallery = json.loads(company['gallery_images'] or '[]')
        gallery.append(pic_url)
        
        conn.execute('UPDATE companies SET gallery_images = ? WHERE id = ?', (json.dumps(gallery), session['company_id']))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'image_url': pic_url})

@app.route('/api/company/upload_picture', methods=['POST'])
def upload_company_picture():
    if 'company_id' not in session:
        return jsonify({'success': False}), 401
        
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'})
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'})
        
    if file:
        filename = secure_filename(f"comp_{session['company_id']}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        pic_url = f"/static/uploads/{filename}"
        conn = get_db_connection()
        conn.execute('UPDATE companies SET profile_picture = ? WHERE id = ?', (pic_url, session['company_id']))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'profile_picture': pic_url})

@app.route('/api/internships', methods=['GET'])
def get_all_internships():
    # Returns a list of all internships (CSV + DB)
    internships = []
    
    # 1. Load CSV Internships
    if recommendation._internships_df is not None:
        internships = recommendation._internships_df.to_dict(orient='records')
        for item in internships:
            item['is_db'] = False
            
    # 2. Add DB Internships
    try:
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT ai.*, c.company_name as company_name_db 
            FROM added_internships ai
            JOIN companies c ON ai.company_id = c.id
            WHERE ai.status = 'active'
        ''').fetchall()
        conn.close()
        
        for r in rows:
            d = dict(r)
            mapped = {
                'Internship title': d['internship_title'],
                'Name of company': d['company_name_db'],
                'Location': d['location'],
                'Required skills': d['required_skills'],
                'Duration': d['duration'],
                'Work mode': d['work_mode'],
                'Stipend': d['stipend'],
                'Fees': d['fees'],
                'Brief description': d['brief_description'],
                'is_db': True,
                'db_id': d['id']
            }
            internships.append(mapped)
    except Exception as e:
        print(f"Error merging DB internships in API: {e}")
        
    return jsonify(internships)


@app.route('/api/company/add_internship', methods=['POST'])
def add_internship():
    if 'company_id' not in session: return jsonify({'success': False}), 401
    data = request.json
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO added_internships (
                company_id, internship_title, location, required_skills, 
                duration, work_mode, stipend, fees, brief_description,
                start_date, end_date, last_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session['company_id'], data.get('title'), data.get('location'),
            data.get('skills'), data.get('duration'), data.get('work_mode'),
            data.get('stipend'), data.get('fees'), data.get('description'),
            data.get('start_date'), data.get('end_date'), data.get('last_date'),
            data.get('status', 'active')
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Internship posted successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/company/edit_internship/<int:id>', methods=['POST'])
def edit_internship(id):
    if 'company_id' not in session: return jsonify({'success': False}), 401
    data = request.json
    try:
        conn = get_db_connection()
        conn.execute('''
            UPDATE added_internships SET 
                internship_title=?, location=?, required_skills=?, 
                duration=?, work_mode=?, stipend=?, fees=?, brief_description=?,
                start_date=?, end_date=?, last_date=?, status=?
            WHERE id=? AND company_id=?
        ''', (
            data.get('title'), data.get('location'), data.get('skills'),
            data.get('duration'), data.get('work_mode'), data.get('stipend'),
            data.get('fees'), data.get('description'), data.get('start_date'),
            data.get('end_date'), data.get('last_date'), data.get('status'),
            id, session['company_id']
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Internship updated successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/company/delete_internship/<int:id>', methods=['DELETE'])
def delete_internship(id):
    if 'company_id' not in session: return jsonify({'success': False}), 401
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM added_internships WHERE id=? AND company_id=?', (id, session['company_id']))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Internship deleted!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/company/my_internships', methods=['GET'])
def get_my_internships():
    if 'company_id' not in session: return jsonify([]), 401
    conn = get_db_connection()
    internships = conn.execute('SELECT * FROM added_internships WHERE company_id = ? ORDER BY id DESC', (session['company_id'],)).fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in internships])

@app.route('/api/company/submit_verification', methods=['POST'])
def submit_verification():
    if 'company_id' not in session: return jsonify({'success': False}), 401
    reg_name = request.form.get('reg_name')
    license_no = request.form.get('license_no')
    country = request.form.get('country')
    file = request.files.get('certificate')
    
    if not file: return jsonify({'success': False, 'message': 'Certificate file is required.'})
    
    ext = file.filename.split('.')[-1]
    filename = f"cert_{session['company_id']}_{int(time.time())}.{ext}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    cert_url = f"/static/uploads/{filename}"
    
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO verification_requests (company_id, reg_name, license_no, country, certificate_path)
            VALUES (?, ?, ?, ?, ?)
        ''', (session['company_id'], reg_name, license_no, country, cert_url))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Verification request submitted!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/company/delete_gallery_image', methods=['POST'])
def delete_gallery_image():
    if 'company_id' not in session: return jsonify({'success': False}), 401
    img_url = request.json.get('url')
    if not img_url: return jsonify({'success': False, 'message': 'URL required'})
    
    try:
        conn = get_db_connection()
        row = conn.execute('SELECT gallery_images FROM companies WHERE id=?', (session['company_id'],)).fetchone()
        if not row: return jsonify({'success': False})
        
        images = json.loads(row['gallery_images'] or '[]')
        if img_url in images:
            images.remove(img_url)
            conn.execute('UPDATE companies SET gallery_images=? WHERE id=?', (json.dumps(images), session['company_id']))
            conn.commit()
            
            # Optional: Delete the file from filesystem if it exists in static/uploads
            if img_url.startswith('/static/uploads/'):
                filename = img_url.split('/')[-1]
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
            
        conn.close()
        return jsonify({'success': True, 'message': 'Image removed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/recommendations', methods=['POST'])
def recommend():
    # Expects JSON: {'skills': '...', 'work_mode': '...', 'location': '...', 'stipend': '...', 'fees': '...'}
    user_query = request.json
    if not user_query:
        # Fallback to DB stored profile if nothing was provided
        if 'student_id' in session:
            conn = get_db_connection()
            student = conn.execute('SELECT skills, address FROM students WHERE id = ?', (session['student_id'],)).fetchone()
            conn.close()
            user_query = {'skills': student['skills'] or '', 'location': student['address'] or ''}
        else:
            return jsonify([])
            
    try:
        recs = recommendation.get_recommendations(user_query, top_n=100)
        return jsonify(recs)
    except Exception as e:
        print(f"Error in recommendation logic: {e}")
        return jsonify([])

@app.route('/api/student/internship_stats', methods=['GET'])
def get_internship_stats():
    if 'student_id' not in session:
        return jsonify({'success': False}), 401
    
    conn = get_db_connection()
    stats = conn.execute('''
        SELECT 
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END) as upcoming
        FROM student_internships WHERE student_id = ?
    ''', (session['student_id'],)).fetchone()
    conn.close()
    
    return jsonify({
        'completed': stats['completed'] or 0,
        'active': stats['active'] or 0,
        'upcoming': stats['upcoming'] or 0
    })

@app.route('/api/student/internship_list', methods=['GET'])
def get_internship_list():
    if 'student_id' not in session: return jsonify([]), 401
    status_filter = request.args.get('status')
    conn = get_db_connection()
    if status_filter:
        rows = conn.execute('SELECT * FROM student_internships WHERE student_id = ? AND status = ?', (session['student_id'], status_filter)).fetchall()
    else:
        rows = conn.execute('SELECT * FROM student_internships WHERE student_id = ?', (session['student_id'],)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/student/apply', methods=['POST'])
def apply_for_internship():
    if 'student_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    data = request.json
    try:
        conn = get_db_connection()
        
        # If it's a DB internship, also record in applications table
        if data.get('is_db') and data.get('db_id'):
            conn.execute('''
                INSERT INTO applications (student_id, internship_id)
                VALUES (?, ?)
            ''', (session['student_id'], data.get('db_id')))
            
        # Keep legacy tracking in student_internships for dashboard stats
        conn.execute('''
            INSERT INTO student_internships (student_id, internship_title, company_name, status)
            VALUES (?, ?, ?, 'active')
        ''', (session['student_id'], data.get('title'), data.get('company')))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Application successful'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ---------- NEW APPLICATION ENDPOINTS ----------

@app.route('/api/company/applications', methods=['GET'])
def get_company_applications():
    if 'company_id' not in session: return jsonify([]), 401
    
    conn = get_db_connection()
    # Fetch applications where the internship belongs to the current company
    apps = conn.execute('''
        SELECT a.id as app_id, a.status, a.applied_at,
               s.full_name, s.email_id, s.skills, s.education,
               i.internship_title, i.id as internship_id
        FROM applications a
        JOIN students s ON a.student_id = s.id
        JOIN added_internships i ON a.internship_id = i.id
        WHERE i.company_id = ?
        ORDER BY a.applied_at DESC
    ''', (session['company_id'],)).fetchall()
    conn.close()
    
    return jsonify([dict(x) for x in apps])

@app.route('/api/company/application/verify', methods=['POST'])
def verify_application():
    if 'company_id' not in session: return jsonify({'success': False}), 401
    data = request.json
    app_id = data.get('app_id')
    new_status = data.get('status') # 'Approved' or 'Denied'
    
    try:
        conn = get_db_connection()
        # Ensure the application belongs to an internship of this company
        check = conn.execute('''
            SELECT a.id FROM applications a
            JOIN added_internships i ON a.internship_id = i.id
            WHERE a.id = ? AND i.company_id = ?
        ''', (app_id, session['company_id'])).fetchone()
        
        if not check:
            conn.close()
            return jsonify({'success': False, 'message': 'Application not found or unauthorized'})
            
        conn.execute('UPDATE applications SET status = ? WHERE id = ?', (new_status, app_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'Application {new_status}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/student/applications', methods=['GET'])
def get_student_applications():
    if 'student_id' not in session: return jsonify([]), 401
    
    conn = get_db_connection()
    apps = conn.execute('''
        SELECT a.id, a.status, a.applied_at,
               i.internship_title, c.company_name,
               i.location, i.duration, i.stipend, i.work_mode
        FROM applications a
        JOIN added_internships i ON a.internship_id = i.id
        JOIN companies c ON i.company_id = c.id
        WHERE a.student_id = ?
        ORDER BY a.applied_at DESC
    ''', (session['student_id'],)).fetchall()
    conn.close()
    
    return jsonify([dict(x) for x in apps])


if __name__ == '__main__':
    app.run(debug=True, port=5000)
