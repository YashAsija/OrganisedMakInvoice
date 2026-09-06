-- Migration: Add qr_preference and document_separator column to company_settings
-- Allows user to choose between UPI QR or Bank QR as their default payment QR code
-- Allows user to customize document number separator (e.g. -, /, _, .)

ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS qr_preference TEXT DEFAULT 'upi' CHECK (qr_preference IN ('upi', 'bank'));

ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS document_separator TEXT DEFAULT '-';

-- Comments explaining the columns
COMMENT ON COLUMN company_settings.qr_preference IS 'Payment QR code generation source: upi or bank';
COMMENT ON COLUMN company_settings.document_separator IS 'Custom separator character for document number formatting (e.g. -, /, _, .)';

