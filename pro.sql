CREATE DATABASE volppro;
USE volppro;

CREATE TABLE Courses (
  course_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE Assignments (
  assignment_id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT,
  title VARCHAR(100) NOT NULL,
  deadline DATE,
  FOREIGN KEY (course_id) REFERENCES Courses(course_id)
);

CREATE TABLE Students (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);
ALTER TABLE Students ADD role ENUM('student','admin') DEFAULT 'student';

CREATE TABLE Submissions (
  submission_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT,
  assignment_id INT,
  file_path VARCHAR(255) NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Students(student_id),
  FOREIGN KEY (assignment_id) REFERENCES Assignments(assignment_id)
);

ALTER TABLE Students ADD password VARCHAR(255) NOT NULL DEFAULT '1234';

DESCRIBE Students;
INSERT INTO Students (name, email, role, password) 
VALUES ('Admin User', 'atharva.mahajan24@vit.edu', 'admin', '12411417');

INSERT INTO Students (name, email, role, password) 
VALUES ('Admin user', 'lokesh.mahajan24@vit.edu', 'admin', '12414504');

SELECT * FROM Students;

CREATE TABLE StudentCourses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT,
  course_id INT,
  FOREIGN KEY (student_id) REFERENCES Students(student_id),
  FOREIGN KEY (course_id) REFERENCES Courses(course_id)
);

ALTER TABLE Courses ADD created_by INT;

DESCRIBE Courses;
SELECT * FROM Courses;
DELETE FROM Assignments WHERE course_id = 14;
SELECT course_id, name, code, created_by FROM Courses;
SELECT student_id, name, email, role FROM Students WHERE role = 'admin';
UPDATE Courses SET created_by = 1 WHERE created_by IS NULL;

SELECT * FROM StudentCourses;
INSERT INTO StudentCourses (student_id, course_id) VALUES (3, 19);



ALTER TABLE Students ADD COLUMN theme VARCHAR(10) DEFAULT 'dark';

CREATE TABLE Reminders (
    reminder_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    assignment_id INT,
    deadline DATETIME,
    status ENUM('pending','sent24','sent12','completed') DEFAULT 'pending',
    FOREIGN KEY (student_id) REFERENCES Students(student_id),
    FOREIGN KEY (assignment_id) REFERENCES Assignments(assignment_id)
);

DELIMITER $$

CREATE TRIGGER assignment_deadline_trigger
AFTER INSERT ON Assignments
FOR EACH ROW
BEGIN
    INSERT INTO Reminders (student_id, assignment_id, deadline)
    SELECT sc.student_id, NEW.assignment_id, NEW.deadline
    FROM StudentCourses sc
    WHERE sc.course_id = NEW.course_id;
END$$

DELIMITER ;







SET SQL_SAFE_UPDATES = 0;

UPDATE Courses 
SET created_by = 1 
WHERE created_by IS NULL;

SELECT course_id, name, code, created_by FROM Courses ORDER BY course_id DESC LIMIT 5;

