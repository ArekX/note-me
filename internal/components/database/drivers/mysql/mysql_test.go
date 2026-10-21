package mysql

import "testing"

func TestParseDSN(t *testing.T) {
	cfg, err := parseDSN("user:p%40ss%2Fword@db.local/noteme?tls=skip-verify")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.User != "user" || cfg.Passwd != "p@ss/word" || cfg.Net != "tcp" || cfg.Addr != "db.local:3306" || cfg.DBName != "noteme" || cfg.TLSConfig != "skip-verify" {
		t.Errorf("config = %+v", cfg)
	}
	if !cfg.ClientFoundRows || cfg.Params["sql_mode"] == "" {
		t.Errorf("found rows = %v, sql_mode = %q", cfg.ClientFoundRows, cfg.Params["sql_mode"])
	}

	cfg, err = parseDSN("root@127.0.0.1:53306/noteme")
	if err != nil || cfg.Addr != "127.0.0.1:53306" || cfg.Passwd != "" {
		t.Errorf("config = %+v, %v", cfg, err)
	}

	if _, err := parseDSN("root@127.0.0.1"); err == nil {
		t.Error("a dsn without a database was accepted")
	}
}
