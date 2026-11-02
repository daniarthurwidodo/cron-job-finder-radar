import type Database from "better-sqlite3";

export interface GoogleConnection {
  accountEmail: string;
  refreshToken: string;
  scope: string;
  connectedAt: string;
}

export class GoogleConnectionRepository {
  constructor(private readonly db: Database.Database) {}

  find(): GoogleConnection | undefined {
    return this.db
      .prepare("SELECT account_email AS accountEmail, refresh_token AS refreshToken, scope, connected_at AS connectedAt FROM google_connections ORDER BY id DESC LIMIT 1")
      .get() as GoogleConnection | undefined;
  }

  replace(connection: GoogleConnection): void {
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM google_connections").run();
      this.db
        .prepare("INSERT INTO google_connections (account_email, refresh_token, scope, connected_at) VALUES (@accountEmail, @refreshToken, @scope, @connectedAt)")
        .run(connection);
    })();
  }

  remove(): void {
    this.db.prepare("DELETE FROM google_connections").run();
  }
}
