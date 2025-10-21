const API_URL = "http://localhost:3000";

function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const emailError = document.getElementById("loginEmailError");

  emailError.textContent = ""; // reset

  if (!email.endsWith("@vit.edu")) {
    emailError.textContent = "❌ Only @vit.edu emails are allowed.";
    return;
  }

  fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert("❌ " + data.error);
      return;
    }

    // ✅ Save full user info
    localStorage.setItem("userId", data.userId);
    localStorage.setItem("userRole", data.role);
    localStorage.setItem("userName", data.name);

    alert("✅ Login successful!");
    window.location.href = "index.html";
  })
  .catch(err => console.error("⚠️ Login error:", err));
}


function signupUser() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;
  const adminSecret = document.getElementById("adminSecret").value.trim();

  if (!name || !email || !password) {
    return alert("⚠️ Please fill in all fields");
  }

  // ✅ Restrict to @vit.edu emails
  if (!email.endsWith("@vit.edu")) {
    return alert("❌ Only @vit.edu emails are allowed.");
  }

  fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role, adminSecret })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("❌ " + data.error);
      } else {
        alert("✅ Signup successful! Please login.");
        window.location.href = "login.html";
      }
    })
    .catch(err => console.error("Signup error:", err));
}

// Toggle password visibility with icon
function togglePassword(id, el) {
  const field = document.getElementById(id);
  if (field.type === "password") {
    field.type = "text";
    el.textContent = "👁️"; // change icon when visible
  } else {
    field.type = "password";
    el.textContent = "👁️"; // back to eye
  }
}

function handleLogout() {
  alert("👋 Logged out.");
  localStorage.removeItem("isLoggedIn");

  // Reset login page UI
  if (document.getElementById("loginBtn")) {
    document.getElementById("loginBtn").style.display = "block";
    document.getElementById("userInfo").style.display = "none";
  }

  // Reset navbar
  updateNavbar();
}

function updateNavbar() {
  const loggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (document.getElementById("navLoginBtn") && document.getElementById("navUserInfo")) {
    if (loggedIn) {
      document.getElementById("navLoginBtn").style.display = "none";
      document.getElementById("navUserInfo").style.display = "flex";
    } else {
      document.getElementById("navLoginBtn").style.display = "inline-block";
      document.getElementById("navUserInfo").style.display = "none";
    }
  }
}

// On page load: update both navbar and login form
window.onload = () => {
  updateNavbar();

  if (localStorage.getItem("isLoggedIn") === "true") {
    if (document.getElementById("loginBtn")) {
      document.getElementById("loginBtn").style.display = "none";
      document.getElementById("userInfo").style.display = "flex";
    }
  }
};
function toggleDropdown() {
  const menu = document.getElementById("dropdownMenu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Close dropdown when clicking outside
window.addEventListener("click", function(event) {
  if (!event.target.matches(".avatar")) {
    const menu = document.getElementById("dropdownMenu");
    if (menu) menu.style.display = "none";
  }
});



// ================= ADMIN =================

// Create Course
function createCourse() {
  const name = document.getElementById("courseName").value;
  const code = document.getElementById("courseCode").value;
  const adminId = localStorage.getItem("userId");

  if (!adminId) {
    alert("⚠️ You must be logged in as admin.");
    return;
  }

  fetch(`${API_URL}/admin/course`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, code, adminId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert("❌ " + data.error);
    } else {
      alert(`✅ ${data.message}\n📌 Course ID: ${data.courseId}`);
    }
  })
  .catch(err => console.error("⚠️ Course creation error:", err));
}

// Add Assignment
function addAssignment() {
  const course_id = document.getElementById("courseId").value.trim();
  const title = document.getElementById("assignmentTitle").value.trim();
  const deadline = document.getElementById("assignmentDeadline").value;

  if (!course_id || !title || !deadline) {
    return alert("⚠️ Please fill all fields.");
  }

  // ✅ Fix route here
  fetch(`${API_URL}/admin/assignment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course_id, title, deadline })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert("❌ " + data.error);
    } else {
      alert("✅ " + data.message);
      location.reload();
    }
  })
  .catch(err => {
    console.error("⚠️ Assignment error:", err);
    alert("⚠️ Failed to add assignment.");
  });
}



// View Submissions
function viewSubmissions() {
  const course_id = document.getElementById("submissionCourseId").value;

  fetch(`${API_URL}/admin/submissions/${course_id}`)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("submissionsList");

      if (data.length === 0) {
        list.innerHTML = "<p>No submissions yet.</p>";
        return;
      }

      list.innerHTML = `
        <h3>📂 Submissions</h3>
        <table border="1" cellspacing="0" cellpadding="8" style="width:100%; color:white; background:rgba(0,0,0,0.4);">
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Assignment</th>
            <th>File</th>
            <th>Submitted At</th>
          </tr>
          ${data.map(row => `
            <tr>
              <td>${row.student_name}</td>
              <td>${row.email}</td>
              <td>${row.assignment_title}</td>
              <td><a href="http://localhost:3000/${row.file_path}" target="_blank" class="btn">Download</a></td>
              <td>${new Date(row.submitted_at).toLocaleString()}</td>
            </tr>
          `).join("")}
        </table>
      `;
    });
}

// ================= STUDENT =================

// Join Course
function joinCourse() {
  const code = document.getElementById("joinCode").value.trim();
  const studentId = localStorage.getItem("userId");

  if (!studentId) {
    return alert("⚠️ Login again, student ID missing.");
  }

  fetch(`${API_URL}/student/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, code })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("❌ " + data.error);
      } else {
        alert("✅ " + data.message);
        location.reload();
      }
    });
}


// Function to update navbar/dashboard links
function updateNavbarLinks() {
  const role = localStorage.getItem("userRole");
  const navLinks = document.querySelector(".nav-links");

  if (!navLinks) return;

  // Remove old role links
  document.querySelectorAll(".role-link").forEach(el => el.remove());

  if (role === "admin") {
    navLinks.innerHTML += `<li class="role-link"><a href="admin-dashboard.html">Admin</a></li>`;
  } else if (role === "student") {
    navLinks.innerHTML += `<li class="role-link"><a href="student-dashboard.html">Student</a></li>`;
  }
}

// Get Assignments
function getAssignments() {
  const course_id = document.getElementById("studentCourseId").value;
  fetch(`${API_URL}/student/assignments/${course_id}`)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("assignmentsList");
      list.innerHTML = "<h3>Assignments:</h3>" + 
        data.map(a => `<p>${a.assignment_id} - ${a.title} (Deadline: ${a.deadline})</p>`).join("");
    });
}

// Submit Assignment
function submitAssignment() {
  const student_id = localStorage.getItem("userId"); // from login
  const assignment_id = document.getElementById("assignmentId").value;
  const fileInput = document.getElementById("submissionFile").files[0];

  if (!student_id || !assignment_id || !fileInput) {
    alert("⚠️ Please fill all fields and join a course first.");
    return;
  }

  const formData = new FormData();
  formData.append("student_id", student_id);
  formData.append("assignment_id", assignment_id);
  formData.append("file", fileInput);

  fetch(`${API_URL}/student/submit`, {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => alert("✅ " + data.message));
}

window.onload = () => {
  updateNavbar();
  updateNavbarLinks(); // add role-based links
};



function openCourses() {
  const role = localStorage.getItem("userRole");

  if (role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else if (role === "student") {
    window.location.href = "student-dashboard.html";
  } else {
    alert("⚠️ Please log in first to access courses.");
    window.location.href = "login.html";
  }
}

function loadAssignments(courseId) {
  fetch(`${API_URL}/student/assignments/${courseId}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("studentAssignments");
      if (!container) return;
      if (data.length === 0) {
                container.innerHTML = "<p>No assignments yet.</p>";
      } else {
                container.innerHTML = data.map(a => `
                  <div class="assignment-card">
                    <p><strong>ID: ${a.assignment_id} - ${a.title}</strong></p>
                    <p>Deadline: ${new Date(a.deadline).toLocaleString()}</p>
                  </div>
                `).join("");
      }
    });
}

// Toggle dropdown
function toggleDropdown() {
  const menu = document.getElementById("dropdownMenu");
  menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

// Hide login button & show avatar after login
function updateNavbar() {
  const userRole = localStorage.getItem("userRole");
  const userName = localStorage.getItem("userName");

  if (userRole) {
    document.getElementById("navLoginBtn").style.display = "none";
    document.getElementById("navUserInfo").style.display = "inline-block";
  } else {
    document.getElementById("navLoginBtn").style.display = "inline-block";
    document.getElementById("navUserInfo").style.display = "none";
  }
}

// Logout
function handleLogout() {
  localStorage.clear();
  alert("✅ Logged out");
  window.location.href = "index.html";
}

// Run on every page load
window.onload = () => {
  updateNavbar();
};


function exploreCourses() {
  const role = localStorage.getItem("userRole");
  const userId = localStorage.getItem("userId");

  if (!role || !userId) {
    alert("⚠️ Please log in first");
    window.location.href = "login.html";
    return;
  }

  if (role === "student") {
    window.location.href = `explore-student.html?student_id=${userId}`;
  } else if (role === "admin") {
    window.location.href = `explore-admin.html?admin_id=${userId}`;
  }
}

function deleteCourse(courseId) {
  if (!confirm("Are you sure you want to delete this course?")) return;

  fetch(`${API_URL}/admin/course/${courseId}`, {
    method: "DELETE"
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("❌ " + data.error);
      } else {
        alert("✅ " + data.message);
        loadCourses(); // reload course list
      }
    })
    .catch(err => console.error("⚠️ Error deleting course:", err));
}


function deleteAssignment(assignmentId) {
  if (!confirm("⚠️ Are you sure you want to delete this assignment?")) return;

  fetch(`${API_URL}/admin/assignment/${assignmentId}`, {
    method: "DELETE"
  })
  .then(async res => {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      if (data.error) {
        alert("❌ " + data.error);
      } else {
        alert("✅ " + data.message);
        location.reload();
      }
    } else {
      const text = await res.text();
      alert("❌ Unexpected response: " + text);
    }
  })
  .catch(err => {
    alert("⚠️ Delete assignment error: " + err);
    console.error("⚠️ Delete assignment error:", err);
  });
}

const userId = localStorage.getItem("userId");

function loadNotifications() {
  fetch(`http://localhost:3000/notifications/${userId}`)
    .then(res => res.json())
    .then(data => {
      const dropdown = document.getElementById("notif-dropdown");
      const notifCount = document.getElementById("notif-count");
      dropdown.innerHTML = "";
      let unreadCount = 0;

      if (data.length === 0) {
        dropdown.innerHTML = "<p>No notifications</p>";
      } else {
        data.forEach(n => {
          let p = document.createElement("p");
          p.className = n.is_read ? "" : "unread";
          if (!n.is_read) unreadCount++;
          p.textContent = n.message;
          p.onclick = () => markAsRead(n.notification_id);
          dropdown.appendChild(p);
        });
      }

      notifCount.textContent = unreadCount;
      notifCount.style.display = unreadCount > 0 ? "inline-block" : "none";
    })
    .catch(err => console.error("⚠️ Notification fetch error:", err));
}

function markAsRead(id) {
  fetch(`http://localhost:3000/notifications/read/${id}`, { method: "PUT" })
    .then(() => {
      console.log("Notification marked as read");
      loadNotifications(); // refresh list immediately
    });
}
// Initial load
loadNotifications();

// Refresh every 30 seconds
setInterval(loadNotifications, 30000);

// Toggle dropdown visibility on bell click
document.getElementById("notif-bell").addEventListener("click", () => {
  const dropdown = document.getElementById("notif-dropdown");
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});
