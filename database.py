import sqlite3
import os

DB_PATH = 'safeintern.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Create students table
    c.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT,
            email_id TEXT UNIQUE,
            username TEXT UNIQUE,
            password TEXT,
            age TEXT,
            gender TEXT,
            education TEXT,
            address TEXT,
            skills TEXT,
            linkedin_link TEXT,
            github_link TEXT,
            contact_no TEXT
        )
    ''')

    # Create companies table
    c.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT,
            email_id TEXT UNIQUE,
            contact_no TEXT,
            username TEXT UNIQUE,
            password TEXT,
            location TEXT
        )
    ''')

    # Create an internships table if they want to dynamically add it 
    # (PRD mentions "add internship section" for companies)
    c.execute('''
        CREATE TABLE IF NOT EXISTS added_internships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            internship_title TEXT,
            required_skills TEXT,
            location TEXT,
            duration TEXT,
            work_mode TEXT,
            stipend TEXT,
            fees TEXT,
            brief_description TEXT,
            FOREIGN KEY(company_id) REFERENCES companies(id)
        )
    ''')

    # Create student_internships table for progress tracking
    c.execute('''
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
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
