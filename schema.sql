CREATE DATABASE IF NOT EXISTS volppro;
USE volppro;

-- Drop tables in reverse order of dependency to avoid foreign key errors
DROP TABLE IF EXISTS Reminders;
DROP TABLE IF EXISTS Submissions;
DROP TABLE IF EXISTS StudentCourses;
DROP TABLE IF EXISTS Assignments;
DROP TABLE IF EXISTS Courses;
DROP TABLE IF EXISTS Students;

-- Create tables with corrected schema and ON DELETE CASCADE

CREATE TABLE Students (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('student','admin') DEFAULT 'student',
  theme VARCHAR(255) DEFAULT 'light'
);

CREATE TABLE Courses (
  course_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES Students(student_id)
);

CREATE TABLE Assignments (
  assignment_id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT,
  title VARCHAR(100) NOT NULL,
  deadline DATE,
  FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
);

CREATE TABLE Submissions (
  submission_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT,
  assignment_id INT,
  file_path VARCHAR(255) NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Students(student_id),
  FOREIGN KEY (assignment_id) REFERENCES Assignments(assignment_id) ON DELETE CASCADE
);

CREATE TABLE Reminders (
  reminder_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT,
  assignment_id INT,
  deadline DATETIME,
  status VARCHAR(50) DEFAULT 'pending',
  FOREIGN KEY (student_id) REFERENCES Students(student_id),
  FOREIGN KEY (assignment_id) REFERENCES Assignments(assignment_id) ON DELETE CASCADE
);

CREATE TABLE StudentCourses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT,
  course_id INT,
  FOREIGN KEY (student_id) REFERENCES Students(student_id),
  FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT INTO Students (name, email, role, password) 
VALUES ('Admin User', 'admin@vit.edu', 'admin', 'admin123');
