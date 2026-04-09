import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
  prefix?: string
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
  tags?: string[]
}

export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal) {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? false,
      auth: { user, pass },
    })
    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
      text: this.formatMessage(signal),
    })
  }

  private logConsole(signal: AlertSignal) {
    if (!this.cfg.console) return
    const formatted = this.formatMessage(signal)
    console.log(`[Alert][${signal.level.toUpperCase()}] ${signal.title}\n${formatted}`)
  }

  private formatMessage(signal: AlertSignal): string {
    const ts = signal.timestamp ?? Date.now()
    const prefix = this.cfg.prefix ? `[${this.cfg.prefix}] ` : ""
    const tags = signal.tags?.length ? `\nTags: ${signal.tags.join(", ")}` : ""
    return `${prefix}${signal.message}\nTime: ${new Date(ts).toISOString()}${tags}`
  }

  async dispatch(signals: AlertSignal[]) {
    for (const sig of signals) {
      try {
        await this.sendEmail(sig)
      } catch (err) {
        console.error("[AlertService] email failed", err)
      }
      try {
        this.logConsole(sig)
      } catch (err) {
        console.error("[AlertService] console log failed", err)
      }
    }
  }
}
