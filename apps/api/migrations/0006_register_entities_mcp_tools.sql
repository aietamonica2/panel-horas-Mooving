INSERT INTO mcp_tool_catalog (name, access_type, domain, description_es, description_en) VALUES
  ('get_clients', 'read', 'entities', 'Obtener la lista de clientes', 'Get clients list'),
  ('create_client', 'write', 'entities', 'Crear un nuevo cliente', 'Create new client'),
  ('update_client', 'write', 'entities', 'Actualizar un cliente', 'Update client'),
  ('delete_client', 'write', 'entities', 'Eliminar un cliente', 'Delete client'),

  ('get_projects', 'read', 'entities', 'Obtener la lista de proyectos', 'Get projects list'),
  ('create_project', 'write', 'entities', 'Crear un nuevo proyecto', 'Create new project'),
  ('update_project', 'write', 'entities', 'Actualizar un proyecto', 'Update project'),
  ('delete_project', 'write', 'entities', 'Eliminar un proyecto', 'Delete project'),

  ('get_employees', 'read', 'entities', 'Obtener la lista de empleados', 'Get employees list'),
  ('create_employee', 'write', 'entities', 'Crear un nuevo empleado', 'Create new employee'),
  ('update_employee', 'write', 'entities', 'Actualizar un empleado', 'Update employee'),
  ('delete_employee', 'write', 'entities', 'Eliminar un empleado', 'Delete employee'),

  ('get_categories', 'read', 'entities', 'Obtener la lista de categorías', 'Get categories list'),
  ('create_category', 'write', 'entities', 'Crear una nueva categoría', 'Create new category'),
  ('update_category', 'write', 'entities', 'Actualizar una categoría', 'Update category'),
  ('delete_category', 'write', 'entities', 'Eliminar una categoría', 'Delete category');
