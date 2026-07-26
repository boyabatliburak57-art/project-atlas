DROP TRIGGER IF EXISTS legal_documents_published_immutable ON legal_documents;
DROP FUNCTION IF EXISTS protect_published_legal_document();
DROP TABLE IF EXISTS user_document_consents;
DROP TABLE IF EXISTS legal_documents;
