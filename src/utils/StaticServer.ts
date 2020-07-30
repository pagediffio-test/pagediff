import { createServer, Server } from "http";
import * as parseUrl from "parseurl";
import * as send from "send";

class StaticServer {
  private server: Server | null = null;

  constructor(private path: string) {}

  start() {
    return new Promise<string>((resolve) => {
      const server = createServer((req, res) => {
        send(req, parseUrl(req)?.pathname || "", { root: this.path }).pipe(res);
      });

      server.listen(0, () => {
        const address = server.address();
        resolve(
          typeof address === "string"
            ? address
            : `http://127.0.0.1:${address?.port || "0"}`
        );
      });

      this.server = server;
    });
  }

  close() {
    if (this.server) {
      this.server.close();
    }
  }
}

export default StaticServer;
