-- Adding sample data for testing the bookstore system
-- Insert sample books
INSERT INTO books (isbn, titulo, autor, precio, stock) VALUES
('9780525564891', 'Cien años de soledad', 'Gabriel García Márquez', 25.99, 15),
('9780525563983', 'El amor en los tiempos del cólera', 'Gabriel García Márquez', 22.50, 8),
('9780307474728', 'La casa de los espíritus', 'Isabel Allende', 24.99, 12),
('9780525432817', 'Rayuela', 'Julio Cortázar', 28.75, 6),
('9780307389732', 'Pedro Páramo', 'Juan Rulfo', 18.99, 20),
('9780525564447', 'Como agua para chocolate', 'Laura Esquivel', 21.50, 10),
('9780307475466', 'La sombra del viento', 'Carlos Ruiz Zafón', 26.99, 14),
('9780525432824', 'Ficciones', 'Jorge Luis Borges', 23.99, 9),
('9780307389749', 'El túnel', 'Ernesto Sabato', 19.99, 11),
('9780525563990', 'Mafalda', 'Quino', 16.99, 25),
('9780525564898', 'Juanito', 'Quino', 16.99, 25);

-- Insert sample sales
INSERT INTO sales (monto_total) VALUES
(48.49),
(71.48),
(35.98);

-- Insert sample sale details
INSERT INTO sale_details (sale_id, book_id, cantidad_vendida, precio_unitario, subtotal) VALUES
(1, 1, 1, 25.99, 25.99),
(1, 5, 1, 18.99, 18.99),
(1, 10, 2, 16.99, 33.98),
(2, 3, 1, 24.99, 24.99),
(2, 7, 1, 26.99, 26.99),
(2, 4, 1, 28.75, 28.75),
(3, 2, 1, 22.50, 22.50),
(3, 9, 1, 19.99, 19.99);
