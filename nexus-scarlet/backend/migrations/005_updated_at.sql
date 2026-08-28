CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER issues_updated_at BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER issue_comments_updated_at BEFORE UPDATE ON issue_comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER releases_updated_at BEFORE UPDATE ON releases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
