const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",     // your MySQL username
  password: "admin",     // your MySQL password
  database: "volppro"
});

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// =========================
// ADMIN ROUTES
// =========================
// Delete assignment (and its submissions)
app.delete("/admin/assignment/:assignmentId", (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  if (isNaN(assignmentId)) {
    return res.status(400).json({ error: "Invalid assignment ID" });
  }

  db.beginTransaction(err => {
    if (err) {
      return res.status(500).json({ error: err });
    }

    db.query("DELETE FROM Reminders WHERE assignment_id = ?", [assignmentId], (err) => {
      if (err) {
        console.error("Error deleting reminders:", err);
        return db.rollback(() => {
          res.status(500).json({ error: err });
        });
      }

      db.query("DELETE FROM Submissions WHERE assignment_id = ?", [assignmentId], (err) => {
        if (err) {
          console.error("Error deleting submissions:", err);
          return db.rollback(() => {
            res.status(500).json({ error: err });
          });
        }

        db.query("DELETE FROM Assignments WHERE assignment_id = ?", [assignmentId], (err, result) => {
          if (err) {
            console.error("Error deleting assignment:", err);
            return db.rollback(() => {
              res.status(500).json({ error: err });
            });
          }

          if (result.affectedRows === 0) {
            return db.rollback(() => {
              res.status(404).json({ error: "Assignment not found" });
            });
          }

          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ error: err });
              });
            }
            res.json({ message: "Assignment deleted successfully" });
          });
        });
      });
    });
  });
});
// ...existing code...

// Add assignment
app.post("/admin/assignment", (req, res) => {
  const { course_id, title, deadline } = req.body;
  db.query("INSERT INTO Assignments (course_id, title, deadline) VALUES (?, ?, ?)", 
    [course_id, title, deadline], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Assignment added", assignmentId: result.insertId });
  });
});

// =========================
// STUDENT ROUTES
// =========================

// Join course (verify code)
app.post("/student/join", (req, res) => {
  const { studentId, code } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: "Student ID missing" });
  }

  db.query("SELECT * FROM Courses WHERE code = ?", [code], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ error: "Course not found" });

    const course = result[0];

    db.query(
      "INSERT INTO StudentCourses (student_id, course_id) VALUES (?, ?)",
      [studentId, course.course_id],
      (err2) => {
        if (err2) {
          if (err2.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ error: "Already joined this course" });
          }
          return res.status(500).json({ error: err2 });
        }

        // ✅ send back studentId also
        res.json({
          message: "Joined course successfully",
          course: course,
          studentId: studentId
        });
      }
    );
  });
});


// Get assignments for a course
app.get("/student/assignments/:course_id", (req, res) => {
  db.query("SELECT * FROM Assignments WHERE course_id = ?", [req.params.course_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// Submit assignment
app.post("/student/submit", upload.single("file"), (req, res) => {
  const { student_id, assignment_id } = req.body;
  const filePath = req.file.path;

  db.query("INSERT INTO Submissions (student_id, assignment_id, file_path) VALUES (?, ?, ?)", 
    [student_id, assignment_id, filePath], (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Assignment submitted successfully!" });
    });
});

// Get courses for a student
app.get("/student/courses/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  db.query(
    `SELECT c.course_id, c.name, c.code
     FROM Courses c
     JOIN StudentCourses sc ON c.course_id = sc.course_id
     WHERE sc.student_id = ?`,
    [studentId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json(result);
    }
  );
});

// Student leaves a course
app.delete("/student/course/:courseId", (req, res) => {
  const { courseId } = req.params;
  const studentId = req.query.studentId;

  db.query(
    "DELETE FROM StudentCourses WHERE student_id = ? AND course_id = ?",
    [studentId, courseId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Course not found or not joined" });
      }
      res.json({ message: "Left course successfully" });
    }
  );
});

// =========================
// SERVER START
// =========================
app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));

// View all submissions for a course
app.get("/admin/submissions/:course_id", (req, res) => {
  const courseId = req.params.course_id;

  const query = `
    SELECT s.name AS student_name, s.email, a.title AS assignment_title, sub.file_path, sub.submitted_at
    FROM Submissions sub
    JOIN Students s ON sub.student_id = s.student_id
    JOIN Assignments a ON sub.assignment_id = a.assignment_id
    WHERE a.course_id = ?`;

  db.query(query, [courseId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.post("/assignments", (req, res) => {
  const { course_id, title, deadline } = req.body; 

  db.query(
    "INSERT INTO Assignments (course_id, title, deadline) VALUES (?, ?, ?)",
    [course_id, title, deadline],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Assignment created", assignmentId: result.insertId });
    }
  );
});

// Signup route
app.post("/signup", (req, res) => {
  const { name, email, password, role, adminSecret } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // ✅ Enforce @vit.edu domain
  if (!email.endsWith("@vit.edu")) {
    return res.status(403).json({ error: "Only @vit.edu emails are allowed" });
  }

  if (role === "admin") {
    if (adminSecret !== "VOLPADMIN123") {
      return res.status(403).json({ error: "Invalid admin secret code" });
    }
  }

  db.query(
    "INSERT INTO Students (name, email, password, role) VALUES (?, ?, ?, ?)",
    [name, email, password, role || "student"],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Email already registered" });
        }
        return res.status(500).json({ error: err });
      }
      res.json({ message: "Signup successful", userId: result.insertId });
    }
  );
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email.endsWith("@vit.edu")) {
    return res.status(403).json({ error: "Only @vit.edu emails are allowed" });
  }

  db.query(
    "SELECT * FROM Students WHERE email = ? AND password = ?",
    [email, password],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.length === 0) return res.status(401).json({ error: "Invalid credentials" });

      const user = result[0];

      res.json({
        message: "Login successful",
        userId: user.student_id,   // ✅ fixed: correct column
        role: user.role
      });
    }
  );
});

// Get courses for a student
app.get("/student/courses/:student_id", (req, res) => {
  const studentId = req.params.student_id;

  const query = `
    SELECT c.course_id, c.name, c.code 
    FROM StudentCourses sc
    JOIN Courses c ON sc.course_id = c.course_id
    WHERE sc.student_id = ?`;

  db.query(query, [studentId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Create course with admin ID
app.post("/admin/course", (req, res) => {
  const { name, code, adminId } = req.body;

  db.query(
    "INSERT INTO Courses (name, code, created_by) VALUES (?, ?, ?)",
    [name, code, adminId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ 
        message: "Course created successfully", 
        courseId: result.insertId   // ✅ return new course_id
      });
    }
  );
});

// ...existing code...


// Get courses created by an admin
app.get("/admin/courses/:admin_id", (req, res) => {
  const adminId = req.params.admin_id;

  db.query("SELECT * FROM Courses WHERE created_by = ?", [adminId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Delete course with admin verification
app.post("/admin/course/delete", (req, res) => {
  const { courseId, adminId } = req.body;

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID required" });
  }

  // First, get all assignment IDs for this course
  db.query(
    "SELECT assignment_id FROM Assignments WHERE course_id = ?",
    [courseId],
    (err, assignments) => {
      if (err) {
        console.error("Error fetching assignments:", err);
        return res.status(500).json({ error: err });
      }
      const assignmentIds = assignments.map(a => a.assignment_id);
      if (assignmentIds.length > 0) {
        // Delete reminders for these assignments
        db.query(
          `DELETE FROM Reminders WHERE assignment_id IN (?)`,
          [assignmentIds],
          (err) => {
            if (err) {
              console.error("Error deleting reminders:", err);
              return res.status(500).json({ error: err });
            }
            // Delete submissions for these assignments
            db.query(
              `DELETE FROM Submissions WHERE assignment_id IN (?)`,
              [assignmentIds],
              (err) => {
                if (err) {
                  console.error("Error deleting submissions:", err);
                  return res.status(500).json({ error: err });
                }
                // Delete assignments for this course
                db.query(
                  "DELETE FROM Assignments WHERE course_id = ?",
                  [courseId],
                  (err) => {
                    if (err) {
                      console.error("Error deleting assignments:", err);
                      return res.status(500).json({ error: err });
                    }
                    // Now delete the course
                    db.query(
                      "DELETE FROM Courses WHERE course_id = ? AND created_by = ?",
                      [courseId, adminId],
                      (err, result) => {
                        if (err) {
                          console.error("Error deleting course:", err);
                          return res.status(500).json({ error: err });
                        }
                        if (result.affectedRows === 0) {
                          return res.status(403).json({ error: "Not authorized or course not found" });
                        }
                        res.json({ message: "Course deleted successfully" });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        // No assignments, just delete the course
        db.query(
          "DELETE FROM Courses WHERE course_id = ? AND created_by = ?",
          [courseId, adminId],
          (err, result) => {
            if (err) {
              console.error("Error deleting course:", err);
              return res.status(500).json({ error: err });
            }
            if (result.affectedRows === 0) {
              return res.status(403).json({ error: "Not authorized or course not found" });
            }
            res.json({ message: "Course deleted successfully" });
          }
        );
      }
    }
  );
});

// ===================== ADMIN: DELETE ASSIGNMENT =====================
// Delete course by admin
app.delete("/admin/course/:id", (req, res) => {
  const courseId = req.params.id;

  // First, get all assignment IDs for this course
  db.query(
    "SELECT assignment_id FROM Assignments WHERE course_id = ?",
    [courseId],
    (err, assignments) => {
      if (err) {
        console.error("Error fetching assignments:", err);
        return res.status(500).json({ error: err });
      }
      const assignmentIds = assignments.map(a => a.assignment_id);
      if (assignmentIds.length > 0) {
        // Delete reminders for these assignments
        db.query(
          `DELETE FROM Reminders WHERE assignment_id IN (?)`,
          [assignmentIds],
          (err) => {
            if (err) {
              console.error("Error deleting reminders:", err);
              return res.status(500).json({ error: err });
            }
            // Delete submissions for these assignments
            db.query(
              `DELETE FROM Submissions WHERE assignment_id IN (?)`,
              [assignmentIds],
              (err) => {
                if (err) {
                  console.error("Error deleting submissions:", err);
                  return res.status(500).json({ error: err });
                }
                // Delete assignments for this course
                db.query(
                  "DELETE FROM Assignments WHERE course_id = ?",
                  [courseId],
                  (err) => {
                    if (err) {
                      console.error("Error deleting assignments:", err);
                      return res.status(500).json({ error: err });
                    }
                    // Now delete the course
                    db.query(
                      "DELETE FROM Courses WHERE course_id = ?",
                      [courseId],
                      (err, result) => {
                        if (err) {
                          console.error("Error deleting course:", err);
                          return res.status(500).json({ error: err });
                        }
                        if (result.affectedRows === 0) {
                          return res.status(404).json({ error: "Course not found" });
                        }
                        res.json({ message: "Course deleted successfully" });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        // No assignments, just delete the course
        db.query(
          "DELETE FROM Courses WHERE course_id = ?",
          [courseId],
          (err, result) => {
            if (err) {
              console.error("Error deleting course:", err);
              return res.status(500).json({ error: err });
            }
            if (result.affectedRows === 0) {
              return res.status(404).json({ error: "Course not found" });
            }
            res.json({ message: "Course deleted successfully" });
          }
        );
      }
    }
  );
});

// Get profile info by user ID
app.get("/profile/:id", (req, res) => {
  const userId = req.params.id;

  db.query(
    "SELECT student_id AS id, name, email, role FROM Students WHERE student_id = ?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(result[0]);
    }
  );
});


// Get profile stats (different for student/admin)
app.get("/profile/:id/stats", (req, res) => {
  const userId = req.params.id;

  db.query("SELECT role FROM Students WHERE student_id = ?", [userId], (err, roleResult) => {
    if (err) return res.status(500).json({ error: err });
    if (roleResult.length === 0) return res.status(404).json({ error: "User not found" });

    const role = roleResult[0].role;

    if (role === "student") {
      // Student stats
      db.query(
        `SELECT 
           (SELECT COUNT(*) FROM StudentCourses WHERE student_id = ?) AS coursesJoined,
           (SELECT COUNT(*) FROM Submissions WHERE student_id = ?) AS assignmentsSubmitted,
           (SELECT COUNT(*) 
              FROM Assignments a
              JOIN StudentCourses sc ON a.course_id = sc.course_id
              WHERE sc.student_id = ?
              AND a.assignment_id NOT IN (
                SELECT assignment_id FROM Submissions WHERE student_id = ?
              )
            ) AS pendingAssignments`,
        [userId, userId, userId, userId],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: err2 });
          res.json(result[0]);
        }
      );
    } else {
      // Admin stats
      db.query(
        `SELECT 
           (SELECT COUNT(*) FROM Courses WHERE created_by = ?) AS coursesCreated,
           (SELECT COUNT(*) 
              FROM Assignments a
              JOIN Courses c ON a.course_id = c.course_id
              WHERE c.created_by = ?
            ) AS assignmentsGiven,
           (SELECT COUNT(*) 
              FROM Submissions s
              JOIN Assignments a ON s.assignment_id = a.assignment_id
              JOIN Courses c ON a.course_id = c.course_id
              WHERE c.created_by = ?
            ) AS totalSubmissions`,
        [userId, userId, userId],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: err2 });
          res.json(result[0]);
        }
      );
    }
  });
});

// Update settings (name, password, theme)
// ✅ Get user settings
app.get("/settings/:id", (req, res) => {
  const userId = req.params.id;

  db.query(
    "SELECT name, email, theme FROM Students WHERE student_id = ?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.length === 0) return res.status(404).json({ error: "User not found" });

      res.json(result[0]);
    }
  );
});

// ✅ Update user settings
app.put("/settings/:id", (req, res) => {
  const userId = req.params.id;
  const { name, password, theme } = req.body;

  if (!name && !password && !theme) {
    return res.status(400).json({ error: "No changes provided" });
  }

  let updates = [];
  let values = [];

  if (name) {
    updates.push("name = ?");
    values.push(name);
  }
  if (password) {
    updates.push("password = ?");
    values.push(password);
  }
  if (theme) {
    updates.push("theme = ?");
    values.push(theme);
  }

  values.push(userId);

  const sql = `UPDATE Students SET ${updates.join(", ")} WHERE student_id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Settings updated successfully" });
  });
});

const cron = require("node-cron");
const nodemailer = require("nodemailer");

// transporter using Gmail (replace with your admin’s email & app password)
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mahajanatharva49@gmail.com",
    pass: "vuvolwyvigduklbu"   // use Gmail app password, not your real password
  }
});

// Run every 30 minutes
cron.schedule("* * * * *", () => {
  console.log("⏳ Checking reminders every minute...");


  db.query(
    `SELECT r.reminder_id, r.status, r.deadline, 
            s.email AS studentEmail, a.title, 
            ad.email AS adminEmail
     FROM Reminders r
     JOIN Students s ON r.student_id = s.student_id
     JOIN Assignments a ON r.assignment_id = a.assignment_id
     JOIN Courses c ON a.course_id = c.course_id
     JOIN Students ad ON c.created_by = ad.student_id
     WHERE r.status != 'completed'`,
    (err, results) => {
      if (err) return console.error(err);

      results.forEach(reminder => {
        const hoursLeft = (new Date(reminder.deadline) - new Date()) / (1000 * 60 * 60);

        let shouldSend = false;
        let newStatus = null;
        let subject = "";
        let body = "";

        if (hoursLeft <= 24 && hoursLeft > 12 && reminder.status === "pending") {
          shouldSend = true;
          newStatus = "sent24";
          subject = `Reminder: Assignment "${reminder.title}" due in 24 hours`;
          body = `Your assignment "${reminder.title}" is due on ${reminder.deadline}. Please complete it on time.`;
        } else if (hoursLeft <= 12 && hoursLeft > 0 && reminder.status === "sent24") {
          shouldSend = true;
          newStatus = "sent12";
          subject = `Reminder: Assignment "${reminder.title}" due in 12 hours`;
          body = `Hurry up! Your assignment "${reminder.title}" is due on ${reminder.deadline}.`;
        } else if (hoursLeft <= 0) {
          newStatus = "completed";
        }

        if (shouldSend) {
          transporter.sendMail({
            from: reminder.adminEmail,
            to: reminder.studentEmail,
            subject,
            text: body
          }, (err, info) => {
            if (err) {
              console.error("❌ Email error:", err);
            } else {
              console.log("📩 Reminder sent:", info.response);
              db.query("UPDATE Reminders SET status=? WHERE reminder_id=?", [newStatus, reminder.reminder_id]);
            }
          });
        } else if (newStatus === "completed") {
          db.query("UPDATE Reminders SET status='completed' WHERE reminder_id=?", [reminder.reminder_id]);
        }
      });
    }
  );
    db.query(
    `SELECT n.notification_id, n.message, s.email, c.name AS course_name, a.title, a.deadline, ad.email AS adminEmail
     FROM Notifications n
     JOIN Students s ON n.student_id = s.student_id
     JOIN Assignments a ON n.message LIKE CONCAT('%', a.title, '%')
     JOIN Courses c ON a.course_id = c.course_id
     JOIN Students ad ON c.created_by = ad.student_id
     WHERE n.sent = FALSE`,
    (err, results) => {
      if (err) return console.error(err);

      results.forEach(n => {
        let mailOptions = {
          from: n.adminEmail,  // ✅ email from course creator
          to: n.email,         // ✅ student email
          subject: `📢 New Assignment in ${n.course_name}`,
          text: `${n.message}\n\nPlease check your dashboard for details.`
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error("❌ Email error:", err);
          } else {
            console.log("📩 Notification sent:", info.response);
            db.query("UPDATE Notifications SET sent=TRUE WHERE notification_id=?", [n.notification_id]);
          }
        });
      });
    }
  );
});

app.post("/admin/assignment", (req, res) => {
  const { course_id, title, deadline } = req.body;

  if (!course_id || !title || !deadline) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.query(
    "INSERT INTO Assignments (course_id, title, deadline) VALUES (?, ?, ?)",
    [course_id, title, deadline],
    (err, result) => {
      if (err) {
        console.error("❌ Error inserting assignment:", err);
        return res.status(500).json({ error: err });
      }

      const assignmentId = result.insertId;

      // ✅ Fetch enrolled students + admin email
      db.query(
        `SELECT s.student_id, s.email AS studentEmail, ad.email AS adminEmail, c.name AS courseName
         FROM StudentCourses sc
         JOIN Students s ON sc.student_id = s.student_id
         JOIN Courses c ON sc.course_id = c.course_id
         JOIN Students ad ON c.created_by = ad.student_id
         WHERE sc.course_id = ?`,
        [course_id],
        (err, students) => {
          if (err) {
            console.error("❌ Error fetching students:", err);
            return res.status(500).json({ error: err });
          }

          if (students.length === 0) {
            console.log("⚠️ No students enrolled in this course");
          }

          students.forEach(st => {
            const message = `📢 New assignment "${title}" added in ${st.courseName}. Deadline: ${deadline}`;

            // ✅ 1) Save notification in DB
            db.query(
              "INSERT INTO Notifications (student_id, message) VALUES (?, ?)",
              [st.student_id, message],
              (err) => {
                if (err) console.error("❌ Error saving notification:", err);
              }
            );

            // ✅ 2) Send email to student
            let mailOptions = {
              from: st.adminEmail,
              to: st.studentEmail,
              subject: `📢 New Assignment in ${st.courseName}`,
              text: message + "\n\nPlease check your dashboard for details."
            };

            transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                console.error("❌ Email error:", err);
              } else {
                console.log("📩 Assignment notification sent:", info.response);
              }
            });
          });
        }
      );

      res.json({ message: "Assignment created, notifications saved & emails sent!", assignmentId });
    }
  );
});

// Admin analytics
app.get("/admin/analytics/:adminId", (req, res) => {
  const adminId = req.params.adminId;
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM Courses WHERE created_by = ?) AS courses,
      (SELECT COUNT(DISTINCT student_id) FROM StudentCourses sc JOIN Courses c ON sc.course_id=c.course_id WHERE c.created_by=?) AS students,
      (SELECT COUNT(*) FROM Assignments a JOIN Courses c ON a.course_id=c.course_id WHERE c.created_by=?) AS assignments,
      (SELECT COUNT(*) FROM Submissions s JOIN Assignments a ON s.assignment_id=a.assignment_id JOIN Courses c ON a.course_id=c.course_id WHERE c.created_by=?) AS submissions
  `;
  db.query(sql, [adminId, adminId, adminId, adminId], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result[0]);
  });
});

// Student analytics
app.get("/student/analytics/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM StudentCourses WHERE student_id=?) AS courses,
      (SELECT COUNT(*) FROM Assignments a JOIN StudentCourses sc ON a.course_id=sc.course_id WHERE sc.student_id=?) AS assignments,
      (SELECT COUNT(*) FROM Submissions WHERE student_id=?) AS submitted,
      (
        (SELECT COUNT(*) FROM Assignments a JOIN StudentCourses sc ON a.course_id=sc.course_id WHERE sc.student_id=?)
        -
        (SELECT COUNT(*) FROM Submissions WHERE student_id=?)
      ) AS pending
  `;
  db.query(sql, [studentId, studentId, studentId, studentId, studentId], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result[0]);
  });
});

// Get notifications for a student
app.get("/notifications/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  db.query(
    "SELECT * FROM Notifications WHERE student_id=? ORDER BY created_at DESC",
    [studentId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json(result);
    }
  );
});

// Mark notification as read
app.put("/notifications/read/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    "UPDATE Notifications SET is_read=TRUE WHERE notification_id=?",
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Notification marked as read" });
    }
  );
});