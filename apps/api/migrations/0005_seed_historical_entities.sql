INSERT INTO clients (id, company_id, name)
SELECT DISTINCT client_id, company_id, MAX(client_name)
FROM time_records 
WHERE date < '2026-06-10'
GROUP BY client_id, company_id;

INSERT INTO projects (id, company_id, client_id, name)
SELECT project_id, company_id, MAX(client_id), MAX(project_name)
FROM time_records 
WHERE date < '2026-06-10'
GROUP BY project_id, company_id;

INSERT INTO employees (id, company_id, name, email)
SELECT DISTINCT employee_id, company_id, MAX(employee_name), MAX(employee_name) || '@moovingtech.com'
FROM time_records 
WHERE date < '2026-06-10'
GROUP BY employee_id, company_id;

INSERT INTO categories (id, company_id, name)
SELECT DISTINCT work_type, company_id, work_type
FROM time_records 
WHERE date < '2026-06-10'
GROUP BY work_type, company_id;
