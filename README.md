# 🛡️ SafeIntern Navigator

> **A smart internship discovery and recommendation platform for students and companies.**

[![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-Web%20Framework-black?logo=flask)](https://flask.palletsprojects.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-orange?logo=scikit-learn)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📌 About The Project

**SafeIntern Navigator** is a full-stack web application that bridges the gap between students seeking internships and companies offering them. It features an intelligent recommendation engine powered by **TF-IDF** and **Cosine Similarity** that matches students to the most relevant internships based on their skills and preferences.

### ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 **Dual Login System** | Separate authentication for Students and Companies |
| 🔍 **Internship Explorer** | Browse and filter internships (paid/free, remote/offline, stipend) |
| 🤖 **AI Recommendations** | Skill-based matching using TF-IDF + Cosine Similarity |
| 🏢 **Company Portal** | Companies can post and manage internship listings |
| 👤 **Student Profiles** | Manage skills, education, LinkedIn, and GitHub links |
| 📱 **Responsive Design** | Optimized for both desktop and mobile devices |

---

## 🏗️ Project Structure

```
SAFEINTERN_NAVIGATOR/
│
├── app.py                  # Main Flask application & route handlers
├── database.py             # Database initialization & helper functions
├── recommendation.py       # TF-IDF + Cosine Similarity recommendation engine
├── extract_colors.py       # Utility for color extraction
├── requirements.txt        # Python dependencies
│
├── templates/              # HTML templates (Jinja2)
├── static/
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript files
│   └── uploads/            # User-uploaded profile images (local only)
│
├── internships.csv         # Internship dataset
├── logo.png                # App logo
└── image_home_-removebg-preview.png  # Home page illustration
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/SAFEINTERN_NAVIGATOR.git
   cd SAFEINTERN_NAVIGATOR
   ```

2. **Create and activate a virtual environment**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize the database**
   ```bash
   python database.py
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. Open your browser and navigate to `http://localhost:5000`

---

## 🧠 How the Recommendation Engine Works

1. Student fills in their **skills, preferred work mode, location, and stipend range** in their profile.
2. The engine applies **TF-IDF vectorization** on both student skills and internship required skills.
3. **Cosine Similarity** is computed between the student vector and all internship vectors.
4. Internships are ranked from **highest to lowest match percentage** and displayed as cards.

---

## 🖥️ Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML, CSS, JavaScript
- **Database:** SQLite (via Python `sqlite3`)
- **ML/Recommendation:** scikit-learn (TF-IDF, Cosine Similarity)
- **Deployment:** Gunicorn

---
## 👥 Team

| Name | Role |
|---|---|
| *(Fiona Sajeev K)* | Developer |
| *(Akshara M P)* | Developer |
| *(Aman V)* | Developer |

---
