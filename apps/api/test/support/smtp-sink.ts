import net from 'node:net';

export interface SinkMessage {
  from: string;
  to: string[];
  raw: string;
  subject: string;
  replyTo: string | null;
  body: string;
}

/** Décode un en-tête MIME `=?UTF-8?Q?...?=` / `=?UTF-8?B?...?=`. */
function decodeHeader(value: string): string {
  return value
    .replace(/\r?\n[ \t]+/g, '')
    .replace(
      /=\?UTF-8\?([QB])\?([^?]*)\?=/gi,
      (_m, kind: string, text: string) =>
        kind.toUpperCase() === 'B'
          ? Buffer.from(text, 'base64').toString('utf-8')
          : Buffer.from(
              text
                .replace(/_/g, ' ')
                .replace(/=([0-9A-F]{2})/gi, (_x, hex: string) =>
                  String.fromCharCode(parseInt(hex, 16)),
                ),
              'latin1',
            ).toString('utf-8'),
    );
}

function decodeBody(headers: string, body: string): string {
  const encoding = /content-transfer-encoding:\s*(\S+)/i
    .exec(headers)?.[1]
    ?.toLowerCase();
  if (encoding === 'base64') {
    return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf-8');
  }
  if (encoding === 'quoted-printable') {
    const bytes = body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/gi, (_m, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
    return Buffer.from(bytes, 'latin1').toString('utf-8');
  }
  return body;
}

/**
 * Serveur SMTP minimal pour les tests : accepte les messages, les décode, et
 * peut refuser temporairement les `failNext` prochains envois (421/451) pour
 * éprouver les nouvelles tentatives. Pas de STARTTLS ni d'authentification.
 */
export class SmtpSink {
  readonly messages: SinkMessage[] = [];
  /** Nombre de prochains `MAIL FROM` à refuser. */
  failNext = 0;
  port = 0;
  private server = net.createServer((socket) => this.handle(socket));

  /** `port` 0 = port libre choisi par le système. */
  async start(port = 0): Promise<void> {
    await new Promise<void>((resolve) =>
      this.server.listen(port, '127.0.0.1', resolve),
    );
    this.port = (this.server.address() as net.AddressInfo).port;
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections?.();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private handle(socket: net.Socket) {
    let from = '';
    let to: string[] = [];
    let inData = false;
    let data = '';
    let buffer = '';
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply('220 smtp-sink ESMTP');

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end === -1) return;
          data += buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          // Dot-stuffing SMTP (RFC 5321 §4.5.2) : un point en début de ligne est doublé à l'envoi.
          this.record(from, to, data.replace(/(^|\r\n)\.\./g, '$1.'));
          from = '';
          to = [];
          data = '';
          reply('250 OK queued');
          continue;
        }
        const newline = buffer.indexOf('\r\n');
        if (newline === -1) return;
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        const command = line.toUpperCase();

        if (command.startsWith('EHLO') || command.startsWith('HELO')) {
          reply('250-smtp-sink');
          reply('250 8BITMIME');
        } else if (command.startsWith('MAIL FROM')) {
          if (this.failNext > 0) {
            this.failNext -= 1;
            reply('451 4.3.0 Temporary failure, try again later');
          } else {
            from = /<([^>]*)>/.exec(line)?.[1] ?? '';
            reply('250 OK');
          }
        } else if (command.startsWith('RCPT TO')) {
          to.push(/<([^>]*)>/.exec(line)?.[1] ?? '');
          reply('250 OK');
        } else if (command === 'DATA') {
          inData = true;
          reply('354 End data with <CR><LF>.<CR><LF>');
        } else if (command === 'RSET') {
          from = '';
          to = [];
          reply('250 OK');
        } else if (command === 'QUIT') {
          reply('221 Bye');
          socket.end();
          return;
        } else {
          reply('250 OK');
        }
      }
    });
    socket.on('error', () => undefined);
  }

  private record(from: string, to: string[], raw: string) {
    const split = raw.indexOf('\r\n\r\n');
    const headers = split === -1 ? raw : raw.slice(0, split);
    const body = split === -1 ? '' : raw.slice(split + 4);
    const header = (name: string) =>
      new RegExp(`^${name}:\\s*((?:.*)(?:\\r?\\n[ \\t].*)*)`, 'im').exec(
        headers,
      )?.[1] ?? null;
    this.messages.push({
      from,
      to,
      raw,
      subject: decodeHeader(header('Subject') ?? ''),
      replyTo: header('Reply-To'),
      body: decodeBody(headers, body),
    });
  }
}
