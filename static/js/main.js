// --- Authentication UI Logic ---
function toggleMode(type) {
    const loginForm = document.getElementById(type + '-login-form');
    if (!loginForm) return;
    const isLoginHidden = loginForm.style.display === 'none' || loginForm.classList.contains('hidden');
    const mode = isLoginHidden ? 'login' : 'register';
    toggleAuthMode(type, mode);
}

// --- Dashboard Navigation ---
function showSection(sectionId, element) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    element.classList.add('active');

    // Update header title
    const headerTitle = document.getElementById('section-header-title');
    if (headerTitle) {
        // Remove icon text if present
        let title = element.innerText.trim();
        headerTitle.textContent = title;
    }

    // Load data based on section
    if (sectionId === 'profile') loadCompanyProfile();
    if (sectionId === 'add-internship') loadMyInternships();
    if (sectionId === 'applications') loadStudentApplications();
}


// --- API Calls for Authentication ---
async function handleLogin(e, type) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const res = await fetch(`/api/login/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success) {
            window.location.href = `/${type}`;
        } else {
            const errElem = document.getElementById(`${type}-login-error`);
            errElem.textContent = result.message;
            errElem.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleRegister(e, type) {
    e.preventDefault();
    if (type === 'student') {
        const p1 = document.getElementById('s-pass').value;
        const p2 = document.getElementById('s-cpass').value;
        if (p1 !== p2) {
            document.getElementById('student-reg-error').textContent = "Passwords do not match!";
            document.getElementById('student-reg-error').style.display = 'block';
            return;
        }
    } else {
        const p1 = document.getElementById('c-pass').value;
        const p2 = document.getElementById('c-cpass').value;
        if (p1 !== p2) {
            document.getElementById('company-reg-error').textContent = "Passwords do not match!";
            document.getElementById('company-reg-error').style.display = 'block';
            return;
        }
    }

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const res = await fetch(`/api/register/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success) {
            alert(result.message);
            toggleMode(type); // switch back to login
        } else {
            const errElem = document.getElementById(`${type}-reg-error`);
            errElem.textContent = result.message;
            errElem.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
    }
}

// --- Student Dashboard Logic ---

async function loadStudentProfile() {
    if (!document.getElementById('profile-form')) return;
    
    try {
        const res = await fetch('/api/student/profile');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('p-fullname').value = data.full_name || '';
            document.getElementById('p-age').value = data.age || '';
            document.getElementById('p-gender').value = data.gender || '';
            document.getElementById('p-education').value = data.education || '';
            document.getElementById('p-address').value = data.address || '';
            document.getElementById('p-skills').value = data.skills || '';
            document.getElementById('p-linkedin').value = data.linkedin_link || '';
            document.getElementById('p-github').value = data.github_link || '';
            
            // Set profile display details
            document.getElementById('profile-name-display').textContent = data.full_name || 'Set your name below';
            document.getElementById('profile-email-display').textContent = data.email_id || '';
            
            // Set top-right header details
            const headerName = document.getElementById('header-user-name');
            const headerImg = document.getElementById('header-user-img');
            if (headerName) headerName.textContent = data.full_name || 'Student';
            
            if (data.profile_picture) {
                document.getElementById('profile-img-display').src = data.profile_picture;
                if (headerImg) headerImg.src = data.profile_picture;
            }
            
            // Auto fill skills in recommendation form
            const recSkills = document.getElementById('rec-skills');
            if (recSkills) recSkills.value = data.skills || '';

            // Load Progress Stats
            loadInternshipStats();
        }
    } catch (err) {
        console.error("Failed to load profile", err);
    }
}

async function loadInternshipStats() {
    const statCompleted = document.getElementById('stat-completed');
    if (!statCompleted) return;
    
    try {
        const res = await fetch('/api/student/internship_stats');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('stat-completed').textContent = data.completed;
            document.getElementById('stat-active').textContent = data.active;
            document.getElementById('stat-upcoming').textContent = data.upcoming;
        }
    } catch (err) {
        console.error("Failed to load stats", err);
    }
}

function toggleProfileEdit() {
    const form = document.getElementById('profile-form');
    const isView = form.classList.contains('view-mode');
    
    if (isView) {
        form.classList.remove('view-mode');
        form.querySelectorAll('input').forEach(i => i.removeAttribute('readonly'));
        form.querySelectorAll('select').forEach(s => s.removeAttribute('disabled'));
    } else {
        form.classList.add('view-mode');
        form.querySelectorAll('input').forEach(i => i.setAttribute('readonly', true));
        form.querySelectorAll('select').forEach(s => s.setAttribute('disabled', true));
    }
}

async function loadCompanyProfile() {
    const pfpDisplay = document.getElementById('company-img-display');
    if (!pfpDisplay && !document.getElementById('header-user-name')) return;
    
    try {
        const res = await fetch('/api/company/profile');
        if (res.ok) {
            const data = await res.json();
            
            const headerName = document.getElementById('header-user-name');
            const headerImg = document.getElementById('header-user-img');
            
            if (headerName) headerName.textContent = data.company_name || 'Company';
            
            if (data.profile_picture) {
                if (pfpDisplay) pfpDisplay.src = data.profile_picture;
                if (headerImg) headerImg.src = data.profile_picture;
            }
            
            const nameDisplay = document.getElementById('company-name-display');
            const emailDisplay = document.getElementById('company-email-display');
            if (nameDisplay) nameDisplay.textContent = data.company_name || 'Set your name below';
            if (emailDisplay) emailDisplay.textContent = data.email_id || '';
        }
    } catch (err) {
        console.error("Failed to load company profile", err);
    }
}

// Auto-load profiles on dashboard pages
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/student')) {
        loadStudentProfile();
    } else if (window.location.pathname.includes('/company')) {
        loadCompanyProfile();
    }
});

async function updateProfile(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const res = await fetch('/api/student/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success && pendingProfilePictureBlob) {
            const picData = new FormData();
            picData.append('file', pendingProfilePictureBlob, 'profile.png');
            await fetch('/api/student/upload_picture', { method: 'POST', body: picData });
            pendingProfilePictureBlob = null;
        }
        
        const msgElem = document.getElementById('profile-msg');
        if (result.success) {
            msgElem.textContent = "Profile Saved!";
            msgElem.style.color = "var(--secondary)";
            // Update the recommendations auto-fill
            document.getElementById('rec-skills').value = data.skills;
            // Return to view mode
            toggleProfileEdit();
        } else {
            msgElem.textContent = "Failed to save.";
            msgElem.style.color = "var(--danger)";
        }
        setTimeout(() => msgElem.textContent = "", 3000);
        // refresh visual details
        document.getElementById('profile-name-display').textContent = data.full_name;
    } catch (err) {
        console.error(err);
    }
}

// --- Cropper flow ---

let cropper;
let currentUploadType = 'student';
let pendingProfilePictureBlob = null;

function handleImageSelect(e, type) {
    currentUploadType = type;
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('crop-image').src = event.target.result;
            document.getElementById('crop-overlay').style.display = 'block';
            document.getElementById('crop-modal').style.display = 'block';
            if (cropper) cropper.destroy();
            cropper = new Cropper(document.getElementById('crop-image'), {
                aspectRatio: 1,
                viewMode: 1
            });
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
}

function closeCropper() {
    document.getElementById('crop-overlay').style.display = 'none';
    document.getElementById('crop-modal').style.display = 'none';
    if(cropper) {
        cropper.destroy();
        cropper = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cropBtn = document.getElementById('crop-btn');
    if (cropBtn) {
        cropBtn.addEventListener('click', () => {
            if (!cropper) return;
            
            cropper.getCroppedCanvas({ width: 300, height: 300 }).toBlob((blob) => {
                pendingProfilePictureBlob = blob;
                const objectUrl = URL.createObjectURL(blob);
                
                if(currentUploadType === 'student') {
                    document.getElementById('profile-img-display').src = objectUrl;
                    document.getElementById('profile-form').classList.remove('view-mode');
                    const msg = document.getElementById('profile-msg');
                    if(msg) { msg.textContent = "Image ready! Click Save Profile to apply."; msg.style.color = "var(--primary)"; }
                } else {
                    document.getElementById('company-img-display').src = objectUrl;
                    document.getElementById('c-form').classList.remove('view-mode');
                    const msg = document.getElementById('c-msg');
                    if(msg) { msg.textContent = "Logo ready! Click Save Profile to apply."; msg.style.color = "var(--primary)"; }
                }
                closeCropper();
            });
        });
    }
});

// --- CV Upload logic ---
async function uploadCVParsing(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const msgElem = document.getElementById('profile-msg');
    msgElem.textContent = "Extracting CV details... Please wait.";
    msgElem.style.color = "var(--secondary)";
    
    try {
        const res = await fetch('/api/student/upload_cv', { method: 'POST', body: formData });
        const result = await res.json();
        
        if (result.success) {
            const d = result.extracted_data;
            if(d.full_name) document.getElementById('s-name').value = d.full_name;
            if(d.age) document.getElementById('s-age').value = d.age;
            if(d.gender) document.getElementById('s-gender').value = d.gender;
            if(d.education) document.getElementById('s-education').value = d.education;
            if(d.address) document.getElementById('s-address').value = d.address;
            if(d.skills) document.getElementById('s-skills').value = d.skills;
            
            // force un-hide the form if it was in view mode
            document.getElementById('profile-form').classList.remove('view-mode');
            
            msgElem.textContent = "CV Parsed! Please verify fields and click Save Profile.";
            msgElem.style.color = "var(--primary)";
        } else {
            alert('Failed to extract: ' + result.message);
            msgElem.textContent = "";
        }
    } catch(err) {
        console.error(err);
        msgElem.textContent = "";
    }
    e.target.value = '';
}

// Render a list of internship cards into a specific container
function renderInternships(data, containerId, highlightMatch = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No internships found matching the criteria.</p>';
        return;
    }

    data.forEach(item => {
     try {
        const skillsList = item['Required skills'] ? item['Required skills'].split(',').map(s => `<span class="tag">${s.trim()}</span>`).join('') : '';
        
        let matchBadge = '';
        if (highlightMatch && item.match_percent) {
            matchBadge = `<div class="match-badge" style="position: absolute; top: -10px; right: 20px; background: var(--primary); color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; z-index: 2;">${item.match_percent}% Match</div>`;
        }

        const companyName = item['Name of company'] || 'Unknown';
        const avatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(companyName) + '&size=64&background=random&color=fff&font-size=0.4';
        
        let stipendDisplay = String(item['Stipend'] || 'Unpaid');
        if (stipendDisplay !== 'Unpaid' && !stipendDisplay.toLowerCase().includes('unpaid') && stipendDisplay !== '0') {
            stipendDisplay = '₹ ' + stipendDisplay;
        } else if (stipendDisplay === '0') {
            stipendDisplay = 'Unpaid';
        }
        
        const fValue = parseStipendValue(item['Fees']);
        let feesDisplay = (fValue === 0) ? 'No Fees' : '₹ ' + fValue;

        const lastDateStr = item['Last Date for Application'] || 'Ongoing';
        let daysLeftHTML = "";
        
        if (lastDateStr && lastDateStr !== 'Ongoing') {
            const today = new Date('2026-03-23');
            const deadline = new Date(lastDateStr);
            const diffTime = deadline - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0) {
                const clockColor = (diffDays <= 3) ? '#ef4444' : '#4CAF50';
                const clockBg = (diffDays <= 3) ? '#fee2e2' : '#E8F5E9';
                const dayText = (diffDays === 0) ? "Last day!" : `${diffDays} days left`;
                daysLeftHTML = `<span class="time-badge" style="background-color: ${clockBg}; color: ${clockColor}; border: 1px solid ${clockColor}; flex: 1;"><i class="fas fa-clock"></i> ${dayText}</span>`;
            }
        }

        const userSkillsStr = String(document.getElementById('rec-skills').value || '');
        const uSkillsArr = userSkillsStr.split(',').map(s => String(s).trim().toLowerCase()).filter(s=>s);
        const reqSkillsArr = item['Required skills'] ? String(item['Required skills']).split(',').map(s => String(s).trim().toLowerCase()).filter(s=>s) : [];
        const reqSkillsOrig = item['Required skills'] ? String(item['Required skills']).split(',').map(s => String(s).trim()).filter(s=>s) : [];
        
        let matched = [];
        let missing = [];
        for(let i=0; i<reqSkillsArr.length; i++){
            let hasSkill = false;
            for(let j=0; j<uSkillsArr.length; j++){
                if(uSkillsArr[j] === reqSkillsArr[i] || uSkillsArr[j].includes(reqSkillsArr[i]) || reqSkillsArr[i].includes(uSkillsArr[j])) {
                    hasSkill = true; break;
                }
            }
            if(hasSkill) matched.push(reqSkillsOrig[i]);
            else missing.push(reqSkillsOrig[i]);
        }

        let risksHTML = "";
        let highlightsHTML = "";

        if (feesDisplay !== 'No Fees') {
            risksHTML += `<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; font-size: 0.7rem; padding: 2px 6px; margin: 2px;"><i class="fas fa-exclamation-triangle"></i> Paid Application</span>`;
        }
        if (stipendDisplay === 'Unpaid') {
            risksHTML += `<span class="badge" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid #f59e0b; font-size: 0.7rem; padding: 2px 6px; margin: 2px;"><i class="fas fa-hand-holding-usd"></i> Unpaid</span>`;
        }
        if (!(item['Brief description'] || '').toLowerCase().includes('certificate')) {
            risksHTML += `<span class="badge" style="background: rgba(107, 114, 128, 0.1); color: #6b7280; border: 1px solid #6b7280; font-size: 0.7rem; padding: 2px 6px; margin: 2px;"><i class="fas fa-certificate"></i> No Cert mentioned</span>`;
        } else {
            highlightsHTML += `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; font-size: 0.7rem; padding: 2px 6px; margin: 2px;"><i class="fas fa-certificate"></i> Certificate Provided</span>`;
        }

        if (uSkillsArr.length > 0 && missing.length === 0) {
            highlightsHTML += `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; font-size: 0.7rem; padding: 2px 6px; margin: 2px;"><i class="fas fa-star"></i> Perfect Skill Match</span>`;
        }
        if (uSkillsArr.length > 0 && missing.length > 0 && matched.length > 0) {
            highlightsHTML += `<span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid #3b82f6; font-size: 0.7rem; padding: 2px 6px; margin: 2px;"><i class="fas fa-lightbulb"></i> Learn ${missing[0]}${missing.length > 1 ? ' +'+(missing.length-1) : ''}</span>`;
        }

        const riskHighlightsHTML = `
                <div class="risk-highlights" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px;">
                    ${highlightsHTML}
                    ${risksHTML}
                </div>
        `;

        const innerFrontHTML = `
                ${matchBadge}
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 5px;">
                    <img src="${avatarUrl}" alt="Logo" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0; font-size: 1.15rem; line-height: 1.3;">${item['Internship title']}</h3>
                </div>
                <div class="company"><i class="fas fa-building"></i> ${companyName}</div>
                <div class="company"><i class="fas fa-map-marker-alt"></i> ${item['Location'] || 'Remote'} &bull; ${item['Work mode']}</div>
                <div class="company"><i class="fas fa-rupee-sign"></i> Stipend: ${stipendDisplay} | Fees: ${feesDisplay}</div>
                <div class="internship-tags">
                    ${skillsList}
                </div>
                <p style="font-size: 0.85rem; margin-top: 10px; flex: 1;">${(item['Brief description'] || '').substring(0, 100)}...</p>
                
                <div style="margin-top: auto; padding-top: 15px; width: 100%;">
                    <div style="display: flex; gap: 10px; margin-bottom: 12px; width: 100%;">
                        <span class="time-badge" style="flex: 1; border: 1px solid #ddd; background: #fafafa; color: #666;"><i class="fas fa-calendar-alt"></i> ${lastDateStr}</span>
                        ${daysLeftHTML || '<div style="flex: 1;"></div>'}
                    </div>
                    <a href="#" class="btn btn-primary" style="width: 100%; text-align: center; display: block; padding: 12px;" onclick="applyToInternship('${item['Internship title'].replace(/'/g, "\\'")}', '${companyName.replace(/'/g, "\\'")}', ${item.is_db || false}, ${item.db_id || 'null'}); return false;">Apply Now</a>
                </div>

        `;

        if (!highlightMatch) {
            const cardHTML = `
                <div class="internship-card glass-panel" style="padding: 25px; display: flex; flex-direction: column; gap: 12px; position: relative;">
                    ${innerFrontHTML}
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHTML);
            return;
        }

        const userWorkMode = String(document.getElementById('rec-workmode').value || '');
        const userLoc = String(document.getElementById('rec-location').value || '');
        
        let verdict = "";
        let verdictColor = "var(--primary)";
        const matchedStr = matched.length > 0 ? `<strong>${matched.join(', ')}</strong>` : "your general profile";
        const missingStr = missing.length > 0 ? `<strong>${missing[0]}</strong>` + (missing.length > 1 ? ` and other key skills` : "") : "all required technologies";

        if (item.match_percent >= 80) {
            verdict = `Excellent Match! You already have ${matchedStr}. This internship is a perfect chance to master ${missingStr}!`;
            verdictColor = "var(--primary)";
        } else if (item.match_percent >= 50) {
            verdict = `Strong Match! You've mastered ${matchedStr}. By joining, you'll gain expertise in ${missingStr}.`;
            verdictColor = "#f59e0b"; // Amber
        } else {
            verdict = `Good Potential! You have ${matchedStr}. This role can help you bridge the gap and learn ${missingStr}.`;
            verdictColor = "var(--secondary)";
        }

        const cardHTML = `
            <div class="internship-card-wrapper">
             <div class="internship-card-inner">
              <div class="internship-card-front glass-panel">
                ${innerFrontHTML}
              </div>

              <div class="internship-card-back glass-panel" style="padding: 25px; display: flex; flex-direction: column; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                    <i class="fas fa-bullseye" style="color: ${verdictColor}; font-size: 1.4rem;"></i>
                    <span style="font-weight: 700; color: ${verdictColor}; font-size: 1.4rem;">${item.match_percent}%</span>
                </div>
                <h4 style="margin: 0 0 20px 0; color: var(--text-main); font-size: 1.25rem;">Recommendation <span style="color: ${verdictColor};">Match</span></h4>
                
                <div class="match-progress-container" style="margin-bottom: 25px; height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
                    <div class="match-progress-bar" style="width: ${item.match_percent}%; background: ${verdictColor}; height: 100%;"></div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h6 style="margin-bottom: 10px; font-weight: 700; color: var(--text-main); font-size: 0.95rem;"><i class="fas fa-check-circle" style="color: #10B981;"></i> Why you match:</h6>
                    <div class="match-verdict" style="border-left: 4px solid ${verdictColor}; background: rgba(47, 128, 237, 0.05); padding: 15px; border-radius: 8px; font-size: 0.92rem; line-height: 1.6; color: var(--text-main);">
                        ${verdict}
                    </div>
                </div>
                
                <div class="match-details">
                    <div class="detail-section">
                        <h6 style="margin-bottom: 10px; font-weight: 700; font-size: 0.95rem; color: var(--text-main);"><i class="fas fa-plus-circle" style="color: var(--secondary);"></i> What you'll learn:</h6>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${missing.length > 0 ? missing.map(s => `<span style="background: rgba(59, 130, 246, 0.1); color: #3B82F6; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 500;">${s}</span>`).join('') : '<em style="font-size:0.8rem; color:var(--text-muted);">Mastery!</em>'}
                        </div>
                    </div>

                    <div class="detail-section" style="margin-top: 25px;">
                        ${risksHTML ? `
                            <h6 style="margin-bottom: 10px; font-weight: 700; font-size: 0.95rem; color: var(--text-main);"><i class="fas fa-shield-alt" style="color: #6b7280;"></i> Risk Analysis:</h6>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 15px;">${risksHTML}</div>
                        ` : ''}
                        
                        ${highlightsHTML ? `
                            <h6 style="margin-bottom: 10px; font-weight: 700; font-size: 0.95rem; color: var(--text-main);"><i class="fas fa-star" style="color: #f59e0b;"></i> Internship Highlights:</h6>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">${highlightsHTML}</div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.05); font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-info-circle"></i>
                        <span>Matched ${matched.length}/${reqSkillsArr.length}</span>
                    </div>
                    <button class="btn btn-primary" style="padding: 8px 15px; font-size: 0.8rem;" onclick="applyToInternship('${item['Internship title'].replace(/'/g, "\\'")}', '${companyName.replace(/'/g, "\\'")}', ${item.is_db || false}, ${item.db_id || 'null'}); return false;">Apply Now</button>

                </div>
              </div>
             </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', cardHTML);
     } catch (e) {
        console.error("Crash rendering card for item:", item, e);
     }
    });
}

// --- Company Features ---

async function loadCompanyProfile() {
    try {
        const res = await fetch('/api/company/profile');
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('c-name').value = data.company_name || '';
        document.getElementById('c-email').value = data.email_id || '';
        if(document.getElementById('c-location')) document.getElementById('c-location').value = data.location || '';
        if(document.getElementById('c-contact')) document.getElementById('c-contact').value = data.contact_no || '';
        if(document.getElementById('c-linkedin')) document.getElementById('c-linkedin').value = data.linkedin_url || '';
        if(document.getElementById('c-website')) document.getElementById('c-website').value = data.website_url || '';
        
        // update header/labels
        document.getElementById('company-name-display').textContent = data.company_name || 'Loading Name...';
        document.getElementById('company-email-display').textContent = data.email_id || '';
        
        const headerName = document.getElementById('header-user-name');
        if(headerName) headerName.textContent = data.company_name || 'Company';

        // dynamic UI Avatar fallback
        const fallbackPic = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.company_name || 'CO') + '&size=120&background=random';
        const picUrl = data.profile_picture || fallbackPic;
        document.getElementById('company-img-display').src = picUrl;
        if(document.getElementById('header-user-img')) document.getElementById('header-user-img').src = picUrl;
        
        // Render Gallery
        renderGallery(data.gallery_images);
        
    } catch(err) { console.error(err); }
}

async function updateCompanyProfile(e) {
    e.preventDefault();
    const data = {
        company_name: document.getElementById('c-name').value,
        email_id: document.getElementById('c-email').value,
        location: document.getElementById('c-location') ? document.getElementById('c-location').value : '',
        contact_no: document.getElementById('c-contact') ? document.getElementById('c-contact').value : '',
        linkedin_url: document.getElementById('c-linkedin') ? document.getElementById('c-linkedin').value : '',
        website_url: document.getElementById('c-website') ? document.getElementById('c-website').value : ''
    };
    
    try {
        const res = await fetch('/api/company/profile', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success && pendingProfilePictureBlob) {
            const picData = new FormData();
            picData.append('file', pendingProfilePictureBlob, 'profile.png');
            await fetch('/api/company/upload_picture', { method: 'POST', body: picData });
            pendingProfilePictureBlob = null;
        }

        const msgElem = document.getElementById('c-msg');
        msgElem.textContent = result.message;
        if(result.success) {
            msgElem.style.color = "var(--primary)";
            toggleEditMode(true); // Switch back to view mode
            loadCompanyProfile(); // Reload to update all displays
        } else {
            msgElem.style.color = "red";
        }
    } catch(err) { console.error(err); }
}

function toggleEditMode(forceView = false) {
    const form = document.getElementById('c-form');
    const actions = document.getElementById('c-save-actions');
    const inputs = form.querySelectorAll('.form-control');
    
    if (forceView || !form.classList.contains('view-mode')) {
        form.classList.add('view-mode');
        if(actions) actions.style.display = 'none';
        inputs.forEach(i => i.setAttribute('readonly', true));
    } else {
        form.classList.remove('view-mode');
        if(actions) actions.style.display = 'block';
        inputs.forEach(i => i.removeAttribute('readonly'));
    }
}

function renderGallery(galleryData) {
    const container = document.getElementById('gallery-container');
    if(!container) return;
    
    let images = [];
    try { images = JSON.parse(galleryData || '[]'); } catch(e) { images = []; }
    
    if (images.length === 0) {
        container.innerHTML = '<p style="color:#888; font-size:0.9rem; margin: 20px 0;">No photos added yet. Click "+ Add Photos" to showcase your workspace.</p>';
        return;
    }
    
    container.innerHTML = images.map(url => `
        <div class="gallery-item">
            <img src="${url}" alt="Gallery">
            <button class="gallery-delete-btn" onclick="deleteGalleryImage('${url}')" title="Delete Photo">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

async function deleteGalleryImage(url) {
    if(!confirm("Are you sure you want to delete this photo?")) return;
    
    try {
        const res = await fetch('/api/company/delete_gallery_image', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url })
        });
        const result = await res.json();
        if(result.success) {
            loadCompanyProfile(); // Refresh to update list
        } else {
            alert("Delete failed: " + result.message);
        }
    } catch(e) { console.error(e); }
}

async function uploadGalleryImage(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await fetch('/api/company/upload_gallery', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if(result.success) {
            loadCompanyProfile(); // Refresh to show new image
        } else {
            alert("Upload failed: " + result.message);
        }
    } catch(e) { console.error(e); }
}

// --- Internship Posting Features ---

let myInternshipsCache = [];

function openPostModal(editData = null) {
    const title = document.getElementById('post-modal-title');
    const form = document.getElementById('add-internship-form');
    
    if (editData) {
        title.textContent = "Edit Internship";
        document.getElementById('post-id').value = editData.id;
        document.getElementById('post-title').value = editData.internship_title;
        document.getElementById('post-location').value = editData.location;
        document.getElementById('post-skills').value = editData.required_skills;
        document.getElementById('post-duration').value = editData.duration;
        document.getElementById('post-mode').value = editData.work_mode;
        document.getElementById('post-stipend').value = editData.stipend;
        document.getElementById('post-fees').value = editData.fees;
        document.getElementById('post-start-date').value = editData.start_date || '';
        document.getElementById('post-end-date').value = editData.end_date || '';
        document.getElementById('post-last-date').value = editData.last_date || '';
        document.getElementById('post-description').value = editData.brief_description;
    } else {
        title.textContent = "Post a New Internship";
        form.reset();
        document.getElementById('post-id').value = "";
    }
    
    document.getElementById('post-modal-overlay').style.display = 'block';
    document.getElementById('post-modal').style.display = 'block';
}

function closePostModal() {
    document.getElementById('post-modal-overlay').style.display = 'none';
    document.getElementById('post-modal').style.display = 'none';
}

async function submitInternship(e) {
    e.preventDefault();
    const id = document.getElementById('post-id').value;
    const data = {
        title: document.getElementById('post-title').value,
        location: document.getElementById('post-location').value,
        skills: document.getElementById('post-skills').value,
        duration: document.getElementById('post-duration').value,
        work_mode: document.getElementById('post-mode').value,
        stipend: document.getElementById('post-stipend').value,
        fees: document.getElementById('post-fees').value,
        start_date: document.getElementById('post-start-date').value,
        end_date: document.getElementById('post-end-date').value,
        last_date: document.getElementById('post-last-date').value,
        description: document.getElementById('post-description').value
    };

    const url = id ? `/api/company/edit_internship/${id}` : '/api/company/add_internship';
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert(id ? "Internship Updated!" : "Internship Published!");
            closePostModal();
            loadMyInternships(); 
        } else {
            alert("Error: " + result.message);
        }
    } catch(err) { console.error(err); }
}

async function loadMyInternships() {
    const container = document.getElementById('my-internships-container');
    if (!container) return;

    try {
        const res = await fetch('/api/company/my_internships');
        const data = await res.json();
        myInternshipsCache = data;
        
        if (data.length === 0) {
            container.innerHTML = '<p style="color: #64748b; font-size: 0.9rem; text-align: center; margin-top: 20px;">No active postings yet.</p>';
            return;
        }

        const companyName = document.getElementById('company-name-display')?.textContent || 'TC';
        const initials = companyName.substring(0, 2).toUpperCase();

        container.innerHTML = data.map(item => {
            // Auto-calculate status from dates
            const now = new Date();
            const start = item.start_date ? new Date(item.start_date) : null;
            const end = item.end_date ? new Date(item.end_date) : null;
            
            let statusClass = 'status-active';
            let statusText = 'Active';
            
            if (start && start > now) {
                statusClass = 'status-coming-soon';
                statusText = 'Coming Soon';
            } else if (end && end < now) {
                statusClass = 'status-completed';
                statusText = 'Completed';
            }

            return `
                <div class="active-posting-card">
                    <div class="active-posting-info">
                        <div class="posting-icon">${initials}</div>
                        <div class="posting-details">
                            <h4>${item.internship_title}</h4>
                            <p>${item.location} | ${item.duration} | ₹${item.stipend}</p>
                        </div>
                    </div>
                    <div class="posting-actions">
                        <div class="posting-stats">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            <button class="btn btn-outline-primary" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px;" onclick="loadCompanyApplications(${item.id})">
                                <i class="fas fa-users"></i> Applications
                            </button>
                        </div>
                        <i class="fas fa-pencil-alt action-icon icon-edit" onclick="editInternship(${item.id})" title="Edit"></i>
                        <i class="fas fa-trash-alt action-icon icon-delete" onclick="deleteInternship(${item.id})" title="Delete"></i>
                    </div>
                </div>

            `;
        }).join('');
    } catch (err) { console.error(err); }
}

function editInternship(id) {
    const item = myInternshipsCache.find(i => i.id === id);
    if (item) openPostModal(item);
}

async function deleteInternship(id) {
    if (!confirm("Are you sure you want to delete this internship?")) return;
    
    try {
        const res = await fetch(`/api/company/delete_internship/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            loadMyInternships();
        } else {
            alert("Failed to delete: " + result.message);
        }
    } catch(e) { console.error(e); }
}

// Load Explorer Default Data
let allInternshipsCache = [];
let filteredExplorerData = [];
let currentExplorerPage = 1;
const explorerCardsPerPage = 60;

async function loadAllInternships() {
    if (!document.getElementById('explorer-grid')) return;
    try {
        const res = await fetch('/api/internships');
        const data = await res.json();
        allInternshipsCache = data;
        filteredExplorerData = data;
        renderExplorerPage(1);
        setupExplorerFilters();
    } catch (err) {
        console.error(err);
    }
}

let currentStipendSort = 'none'; // 'none', 'desc', 'asc'

function toggleStipendSort() {
    if (currentStipendSort === 'none' || currentStipendSort === 'asc') {
        currentStipendSort = 'desc';
        document.getElementById('sort-stipend-icon').className = 'fas fa-sort-amount-down';
    } else {
        currentStipendSort = 'asc';
        document.getElementById('sort-stipend-icon').className = 'fas fa-sort-amount-up';
    }
    applyExplorerFilters();
}

function toggleCustomStipend() {
    const val = document.getElementById('filter-stipend').value;
    document.getElementById('custom-stipend-range').style.display = (val === 'custom') ? 'flex' : 'none';
    applyExplorerFilters();
}

function toggleRecCustomStipend() {
    const val = document.getElementById('rec-stipend-select').value;
    document.getElementById('rec-custom-stipend-range').style.display = (val === 'custom') ? 'flex' : 'none';
}

function parseStipendValue(stipendStr) {
    if (!stipendStr) return 0;
    const cleaned = String(stipendStr).replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned) : 0;
}

function applyExplorerFilters() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const mode = document.getElementById('filter-workmode').value;
    const fees = document.getElementById('filter-fees').value;
    const stipendRange = document.getElementById('filter-stipend').value;
    
    let stipMin = 0; let stipMax = Infinity;
    if (stipendRange && stipendRange !== 'custom') {
        const parts = stipendRange.split('-');
        stipMin = parseInt(parts[0]);
        stipMax = parseInt(parts[1]);
    } else if (stipendRange === 'custom') {
        const cMin = parseInt(document.getElementById('stipend-min').value);
        const cMax = parseInt(document.getElementById('stipend-max').value);
        stipMin = isNaN(cMin) ? 0 : cMin;
        stipMax = isNaN(cMax) ? Infinity : cMax;
    }
    
    let filtered = allInternshipsCache.filter(item => {
        const title = String(item['Internship title'] || '').toLowerCase();
        const comp = String(item['Name of company'] || '').toLowerCase();
        const matchesSearch = title.includes(search) || comp.includes(search);
        
        const wStr = String(item['Work mode'] || '').toLowerCase();
        const matchesMode = mode === '' || wStr.includes(mode.toLowerCase());
        
        const fStr = String(item['Fees'] || '').toLowerCase();
        let itemFees = (fStr === '' || fStr === '0' || fStr === 'no' || fStr === 'none' || fStr === 'free') ? 'No Fees' : 'Paid';
        const matchesFees = fees === '' || itemFees === fees;
        
        const itemStipend = parseStipendValue(item['Stipend']);
        
        let matchesStipend = true;
        if (stipendRange && stipendRange !== 'custom') {
            matchesStipend = (itemStipend >= stipMin && itemStipend <= stipMax);
        } else if (stipendRange === 'custom') {
            matchesStipend = (itemStipend >= stipMin && itemStipend <= stipMax);
        }
        
        return matchesSearch && matchesMode && matchesFees && matchesStipend;
    });
    
    if (currentStipendSort !== 'none') {
        filtered.sort((a, b) => {
            const sA = parseStipendValue(a['Stipend']);
            const sB = parseStipendValue(b['Stipend']);
            return currentStipendSort === 'desc' ? sB - sA : sA - sB;
        });
    }
    
    
    filteredExplorerData = filtered;
    currentExplorerPage = 1;
    renderExplorerPage(1);
}

function renderExplorerPage(page) {
    currentExplorerPage = page;
    const start = (page - 1) * explorerCardsPerPage;
    const end = start + explorerCardsPerPage;
    const pageData = filteredExplorerData.slice(start, end);
    
    renderInternships(pageData, 'explorer-grid', false); // No flip for explorer
    renderExplorerPaginationControls();
    
    // Scroll to section header to maintain context
    const header = document.getElementById('section-header-title');
    if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderExplorerPaginationControls() {
    const totalPages = Math.ceil(filteredExplorerData.length / explorerCardsPerPage);
    const container = document.getElementById('explorer-pagination');
    if (!container) return;
    
    container.innerHTML = '';
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `btn ${currentExplorerPage === 1 ? 'btn-secondary' : 'btn-outline-primary'}`;
    prevBtn.disabled = currentExplorerPage === 1;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
    prevBtn.onclick = () => renderExplorerPage(currentExplorerPage - 1);
    container.appendChild(prevBtn);
    
    // Page info
    const info = document.createElement('span');
    info.style.alignSelf = 'center';
    info.style.fontWeight = '600';
    info.textContent = `Page ${currentExplorerPage} of ${totalPages}`;
    container.appendChild(info);
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `btn ${currentExplorerPage === totalPages ? 'btn-secondary' : 'btn-outline-primary'}`;
    nextBtn.disabled = currentExplorerPage === totalPages;
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = () => renderExplorerPage(currentExplorerPage + 1);
    container.appendChild(nextBtn);
}

function setupExplorerFilters() {
    document.getElementById('search-input')?.addEventListener('input', applyExplorerFilters);
    document.getElementById('filter-workmode')?.addEventListener('change', applyExplorerFilters);
    document.getElementById('filter-fees')?.addEventListener('change', applyExplorerFilters);
    document.getElementById('filter-stipend')?.addEventListener('change', applyExplorerFilters);
}

function goToRecommendations() {
    const recLink = document.querySelector('a.sidebar-link[onclick*="recommendations"]');
    if (recLink) {
        showSection('recommendations', recLink);
    }
    
    // Auto-invoke the recommendation engine using existing values
    getRecommendations();
}

let currentRecommendations = [];
let currentRecPage = 1;
const recsPerPage = 15;

// Render a specific page of recommendations
function renderRecommendationPage(page) {
    currentRecPage = page;
    const startIndex = (page - 1) * recsPerPage;
    const endIndex = startIndex + recsPerPage;
    const currentSlice = currentRecommendations.slice(startIndex, endIndex);
    
    renderInternships(currentSlice, 'recommendations-grid', true);
    renderPaginationControls();
}

// Render pagination HTML
function renderPaginationControls() {
    const container = document.getElementById('rec-pagination');
    if (currentRecommendations.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(currentRecommendations.length / recsPerPage);
    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    let html = '';
    
    if (currentRecPage > 1) {
        html += `<a href="#!" onclick="renderRecommendationPage(${currentRecPage - 1}); return false;" style="color: var(--primary); text-decoration: none;"><i class="fas fa-chevron-left"></i> Prev</a>`;
    }
    
    // Simple 1 to totalPages
    for (let i = 1; i <= totalPages; i++) {
        const activeStyle = i === currentRecPage ? 'font-weight: bold; text-decoration: underline;' : 'text-decoration: none;';
        html += `<a href="#!" onclick="renderRecommendationPage(${i}); return false;" style="color: var(--primary); margin: 0 5px; ${activeStyle}">${i}</a>`;
    }
    
    if (currentRecPage < totalPages) {
        html += `<a href="#!" onclick="renderRecommendationPage(${currentRecPage + 1}); return false;" style="color: var(--primary); text-decoration: none;">Next <i class="fas fa-chevron-right"></i></a>`;
    }
    
    container.innerHTML = html;
}

// Get AI Recommendations
async function getRecommendations(e) {
    if(e) e.preventDefault();
    
    const loader = document.getElementById('rec-loader');
    const grid = document.getElementById('recommendations-grid');
    const header = document.getElementById('rec-header');
    const pagination = document.getElementById('rec-pagination');
    
    let stipendMin = 0;
    const recStipRange = document.getElementById('rec-stipend-select').value;
    if (recStipRange === 'custom') {
        stipendMin = parseInt(document.getElementById('rec-stipend-min').value) || 0;
    } else if (recStipRange.includes('-')) {
        stipendMin = parseInt(recStipRange.split('-')[0]);
    } else {
        stipendMin = parseInt(recStipRange) || 0;
    }

    let maxFees = 999999;
    const feesPref = document.getElementById('rec-fees-select').value;
    if (feesPref === 'free') maxFees = 0;

    const query = {
        skills: document.getElementById('rec-skills').value,
        work_mode: document.getElementById('rec-workmode').value,
        location: document.getElementById('rec-location').value,
        stipend: stipendMin,
        fees: maxFees
    };
    
    loader.style.display = 'block';
    grid.innerHTML = '';
    pagination.style.display = 'none';
    header.style.display = 'none';
    
    try {
        const res = await fetch('/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query)
        });
        const data = await res.json();
        
        loader.style.display = 'none';
        header.style.display = 'block';
        
        currentRecommendations = data;
        renderRecommendationPage(1);
        
    } catch (err) {
        console.error(err);
        loader.style.display = 'none';
    }
}

async function applyToInternship(title, company, isDb = false, dbId = null) {
    try {
        const res = await fetch('/api/student/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, company, is_db: isDb, db_id: dbId })
        });
        const result = await res.json();
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            loadInternshipStats();
            if (isDb) loadStudentApplications(); // Refresh applications list if valid
        }
    } catch (err) {
        console.error(err);
    }
}

async function viewInternshipDetails(status) {
    const overlay = document.getElementById('details-overlay');
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-content-list');
    const title = document.getElementById('modal-title');
    
    title.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)} Internships`;
    content.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    overlay.style.display = 'block';
    modal.style.display = 'block';
    
    try {
        const res = await fetch(`/api/student/internship_list?status=${status}`);
        const data = await res.json();
        
        if (data.length === 0) {
            content.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No internships found in this category.</p>';
            return;
        }
        
        content.innerHTML = data.map(item => `
            <div class="details-modal-item">
                <h4>${item.internship_title}</h4>
                <p><strong>Company:</strong> ${item.company_name}</p>
                <p><strong>Status:</strong> ${item.status}</p>
            </div>
        `).join('');
    } catch (err) {
        content.innerHTML = '<p style="color:var(--danger); text-align:center;">Failed to load details.</p>';
    }
}

function closeDetailsModal() {
    const overlay = document.getElementById('details-overlay');
    const modal = document.getElementById('details-modal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
}

// --- Application Management Logic ---

async function loadStudentApplications() {
    const container = document.getElementById('applications-list');
    if (!container) return;
    
    try {
        const res = await fetch('/api/student/applications');
        const data = await res.json();
        
        if (data.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-inbox fa-3x" style="margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>You haven't applied for any dashboard internships yet.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.map(app => {
            let statusColor = 'var(--primary)';
            if (app.status === 'Approved') statusColor = '#10B981';
            if (app.status === 'Denied') statusColor = '#EF4444';
            
            return `
                <div class="internship-card glass-panel" style="padding: 25px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3 style="margin: 0; font-size: 1.15rem;">${app.internship_title}</h3>
                        <span style="background: ${statusColor}1a; color: ${statusColor}; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; border: 1px solid ${statusColor}33;">
                            ${app.status}
                        </span>
                    </div>
                    <div class="company"><i class="fas fa-building"></i> ${app.company_name}</div>
                    <div class="company"><i class="fas fa-map-marker-alt"></i> ${app.location} | ${app.work_mode}</div>
                    <div class="company" style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
                        Applied on: ${new Date(app.applied_at).toLocaleDateString()}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--danger);">Failed to load applications.</p>';
    }
}

async function loadCompanyApplications(internshipId) {
    const overlay = document.getElementById('apps-modal-overlay');
    const modal = document.getElementById('apps-modal');
    const container = document.getElementById('apps-list-container');
    
    overlay.style.display = 'block';
    modal.style.display = 'block';
    container.innerHTML = '<p style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading applicants...</p>';
    
    try {
        const res = await fetch('/api/company/applications');
        const data = await res.json();
        
        // Filter by specific internship if needed, though we can just show all and filter in JS
        const filtered = data.filter(a => a.internship_id === internshipId);
        
        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #64748b;">No applicants for this posting yet.</p>';
            return;
        }
        
        container.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="text-align: left; border-bottom: 2px solid #eee;">
                        <th style="padding: 12px;">Applicant</th>
                        <th style="padding: 12px;">Skills</th>
                        <th style="padding: 12px;">Applied Date</th>
                        <th style="padding: 12px;">Status</th>
                        <th style="padding: 12px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(app => `
                        <tr style="border-bottom: 1px solid #f5f5f5;">
                            <td style="padding: 15px;">
                                <div style="font-weight: 600;">${app.full_name}</div>
                                <div style="font-size: 0.8rem; color: #666;">${app.email_id}</div>
                            </td>
                            <td style="padding: 15px; font-size: 0.85rem;">${app.skills || 'N/A'}</td>
                            <td style="padding: 15px; font-size: 0.85rem;">${new Date(app.applied_at).toLocaleDateString()}</td>
                            <td style="padding: 15px;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: ${app.status === 'Approved' ? '#10B981' : (app.status === 'Denied' ? '#EF4444' : '#3B82F6')}">
                                    ${app.status}
                                </span>
                            </td>
                            <td style="padding: 15px;">
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-primary" style="padding: 5px 10px; font-size: 0.75rem;" onclick="verifyApplication(${app.app_id}, 'Approved', ${internshipId})">Approve</button>
                                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.75rem;" onclick="verifyApplication(${app.app_id}, 'Denied', ${internshipId})">Deny</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="text-align: center; color: red;">Failed to load applicants.</p>';
    }
}

async function verifyApplication(appId, status, internshipId) {
    try {
        const res = await fetch('/api/company/application/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_id: appId, status: status })
        });
        const result = await res.json();
        
        if (result.success) {
            showNotification(`Application ${status}!`);
            loadCompanyApplications(internshipId); // Refresh modal list
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        console.error(err);
    }
}

function closeAppsModal() {
    document.getElementById('apps-modal-overlay').style.display = 'none';
    document.getElementById('apps-modal').style.display = 'none';
}


// --- Company Verification Features ---

function showVerification() {
    document.getElementById('v-modal-overlay').style.display = 'block';
    document.getElementById('v-modal').style.display = 'block';
}

function closeVerificationModal() {
    document.getElementById('v-modal-overlay').style.display = 'none';
    document.getElementById('v-modal').style.display = 'none';
}

function updateUploadLabel(input) {
    if (input.files && input.files[0]) {
        const zone = input.parentElement;
        const p = zone.querySelector('p');
        p.textContent = "Selected: " + input.files[0].name;
        p.style.color = "var(--secondary)";
    }
}

async function submitVerification(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Submitting...";

    const formData = new FormData();
    formData.append('reg_name', document.getElementById('v-reg-name').value);
    formData.append('license_no', document.getElementById('v-license').value);
    formData.append('country', document.getElementById('v-country').value);
    formData.append('certificate', document.getElementById('v-cert-file').files[0]);

    try {
        const res = await fetch('/api/company/submit_verification', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if (result.success) {
            showNotification("Verification Request Submitted Successfully!");
            // Return to profile section
            const profileLink = document.querySelector('.sidebar-link[onclick*="profile"]');
            closeVerificationModal();
        } else {
            showNotification("Error: " + result.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification("An error occurred during submission.", 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('profile-form')) {
        loadStudentProfile();
        if (typeof loadAllInternships === 'function') loadAllInternships();
    } else if (document.getElementById('company-name-display') || document.getElementById('c-form')) {
        const activeSection = document.querySelector('.section.active');
        if (activeSection) {
            if (activeSection.id === 'profile') loadCompanyProfile();
            if (activeSection.id === 'add-internship') loadMyInternships();
        } else {
            loadCompanyProfile(); // fallback
        }
    }
});

// --- Global Authentication Modal ---

function openAuthModal(mode = 'login') {
    const overlay = document.getElementById('auth-modal-overlay');
    const modal = document.getElementById('auth-modal');
    if (!overlay || !modal) return;
    
    overlay.style.display = 'block';
    modal.style.display = 'block';
    
    switchUserType('student');
    toggleAuthMode('student', mode);
}

function closeAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    const modal = document.getElementById('auth-modal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
}

function switchUserType(type) {
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    const studentTab = document.getElementById('tab-student');
    const companyTab = document.getElementById('tab-company');
    const formStudent = document.getElementById('form-student');
    const formCompany = document.getElementById('form-company');

    if (type === 'student') {
        if (studentTab) studentTab.classList.add('active');
        if (formStudent) {
            formStudent.style.display = 'block';
            formStudent.classList.remove('hidden');
        }
        if (formCompany) {
            formCompany.style.display = 'none';
            formCompany.classList.add('hidden');
        }
    } else {
        if (companyTab) companyTab.classList.add('active');
        if (formStudent) {
            formStudent.style.display = 'none';
            formStudent.classList.add('hidden');
        }
        if (formCompany) {
            formCompany.style.display = 'block';
            formCompany.classList.remove('hidden');
        }
    }
    toggleAuthMode(type, 'login');
}

function toggleAuthMode(userType, mode) {
    const loginForm = document.getElementById(userType + '-login-form');
    const registerForm = document.getElementById(userType + '-register-form');
    if (!loginForm || !registerForm) return;
    
    if (mode === 'login') {
        loginForm.style.display = 'block';
        loginForm.classList.remove('hidden');
        registerForm.style.display = 'none';
        registerForm.classList.add('hidden');
    } else {
        loginForm.style.display = 'none';
        loginForm.classList.add('hidden');
        registerForm.style.display = 'block';
        registerForm.classList.remove('hidden');
    }
    updateAuthHeadings();
}

function updateAuthHeadings() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    if (!title || !subtitle) return;
    
    const studentTab = document.getElementById('tab-student');
    const isStudent = studentTab ? studentTab.classList.contains('active') : true;
    const userType = isStudent ? 'student' : 'company';
    const loginForm = document.getElementById(userType + '-login-form');
    if (!loginForm) return;
    
    const isLogin = loginForm.style.display !== 'none' && !loginForm.classList.contains('hidden');
    const userDisplay = isStudent ? 'Student' : 'Company';
    
    if (isLogin) {
        title.textContent = userDisplay + ' Login';
        subtitle.textContent = 'Login to your account';
    } else {
        title.textContent = userDisplay + ' Registration';
        subtitle.textContent = 'Create a new account';
    }
}

async function handleLogin(e, type) {
    e.preventDefault();
    const form = e.target;
    const errorMsg = document.getElementById(type + '-login-error');
    const btn = form.querySelector('button');
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    const originalText = btn ? btn.textContent : 'Login';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Logging in...';
    }
    if (errorMsg) errorMsg.style.display = 'none';

    try {
        const res = await fetch(`/api/login/${type}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success) {
            window.location.href = type === 'student' ? '/student' : '/company';
        } else {
            if (errorMsg) {
                errorMsg.textContent = result.message;
                errorMsg.style.display = 'block';
            } else {
                showNotification(result.message, 'error');
            }
        }
    } catch (err) {
        console.error(err);
        if (errorMsg) {
            errorMsg.textContent = 'An error occurred. Please try again.';
            errorMsg.style.display = 'block';
        } else {
            showNotification('An error occurred. Please try again.', 'error');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

async function handleRegister(e, type) {
    e.preventDefault();
    const form = e.target;
    const errorMsg = document.getElementById(type + '-reg-error');
    const btn = form.querySelector('button');
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Safely check confirm password if input exists
    const confirmPassInput = form.querySelector('input[name="confirm_password"]') ||
                             form.querySelector('input[placeholder*="Confirm"]') ||
                             form.querySelector('#s-cpass, #c-cpass');
                             
    if (confirmPassInput && confirmPassInput.value !== undefined) {
        if (data.password !== confirmPassInput.value) {
            if (errorMsg) {
                errorMsg.textContent = "Passwords do not match!";
                errorMsg.style.display = 'block';
            } else {
                showNotification("Passwords do not match!", "error");
            }
            return;
        }
    }

    const originalText = btn ? btn.textContent : 'Register';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Registering...';
    }
    if (errorMsg) errorMsg.style.display = 'none';

    try {
        const res = await fetch(`/api/register/${type}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success) {
            showNotification(result.message || 'Registration Successful! Please login.', 'success');
            form.reset();
            toggleAuthMode(type, 'login');
        } else {
            if (errorMsg) {
                errorMsg.textContent = result.message;
                errorMsg.style.display = 'block';
            } else {
                showNotification(result.message, 'error');
            }
        }
    } catch (err) {
        console.error(err);
        if (errorMsg) {
            errorMsg.textContent = 'An error occurred. Please try again.';
            errorMsg.style.display = 'block';
        } else {
            showNotification('An error occurred. Please try again.', 'error');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

// --- Custom Notifications (Toast) ---

function showNotification(message, type = 'success') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
