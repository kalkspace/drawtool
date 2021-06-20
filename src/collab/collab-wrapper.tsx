import React, { useState, useCallback } from "react";
import { encode, decode } from "base64-arraybuffer";
import styles from "./collab-wrapper.module.css";
import { useRef } from "react";
import { nanoid } from "nanoid";

interface ModalProps {
  onUsernameChange: (name: string) => any;
  onStartSession: () => any;
  username: string;
}

const Modal: React.FunctionComponent<ModalProps> = ({
  onStartSession,
  onUsernameChange,
  username,
}) => {
  return (
    <div className={styles.modalWrapper}>
      <div className={styles.modal}>
        <input
          placeholder="User name"
          value={username}
          onChange={(ev) => onUsernameChange(ev.target.value)}
        />
        <button onClick={onStartSession}>Start Session</button>
      </div>
    </div>
  );
};

const EVENT_SOURCE_TARGET = "http://localhost:8080";

interface SessionPayload {
  id: string;
  payload: string;
}

type Update =
  | { type: "JOIN"; name: string | null }
  | { type: "INIT" }
  | { type: "UPDATE" };

class Session {
  private roomId: string;
  private sessionId: string;
  private stream: EventSource | null = null;

  constructor(room: string, id: string) {
    this.roomId = room;
    this.sessionId = id;
  }

  async init(username: string | null) {
    const target = new URL(EVENT_SOURCE_TARGET);
    target.pathname = `/collab/${this.roomId}`;
    const sessionRequest: SessionPayload = {
      id: this.sessionId,
      payload: this.encodePayload({ type: "JOIN", name: username }),
    };
    const joinResp = await fetch(target.toString(), {
      method: "POST",
      body: JSON.stringify(sessionRequest),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!joinResp.ok) {
      throw new Error(`Unable to connect: ${joinResp.status}`);
    }

    target.pathname = `/collab/${this.roomId}/${this.sessionId}`;
    const sse = new EventSource(target.toString());
    sse.addEventListener("message", this.handleMessage);
    sse.addEventListener("error", this.handleError);

    if (sse.readyState != sse.OPEN) {
      await new Promise((res) =>
        sse.addEventListener("open", res, { once: true })
      );
    }

    this.stream = sse;
  }

  handleMessage = ({ data }: Event & { data: unknown }) =>
    console.log("got event:", { data });

  handleError = (ev: Event) => console.error(ev);

  encodePayload(payload: Update): string {
    const json = JSON.stringify(payload);
    const binary = new TextEncoder().encode(json);
    // todo: encrypt
    return encode(binary);
  }

  decodePayload(payload: string): Update {
    const binary = decode(payload);
    const json = new TextDecoder().decode(binary);
    return JSON.parse(json);
  }

  private updateUrl(): string {
    const target = new URL(EVENT_SOURCE_TARGET);
    target.pathname = `/collab/${this.roomId}`;
    return target.toString();
  }

  async broadcast(payload: Update) {
    const encoded = this.encodePayload(payload);
    const update: SessionPayload = {
      id: this.sessionId,
      payload: encoded,
    };
    await fetch(this.updateUrl(), {
      method: "PUT",
      body: JSON.stringify(update),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  close() {
    this.stream?.close();
  }
}

interface WrapperProps {}

export const Wrapper: React.FunctionComponent<WrapperProps> = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isConnected, setConnected] = useState(false);
  const sessionRef = useRef<Session | null>();

  const startSession = useCallback(
    async (username: string | null) => {
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }

      const roomId = nanoid();
      const sessionId = nanoid();
      const session = new Session(roomId, sessionId);
      await session.init(username);

      setConnected(true);
    },
    [sessionRef]
  );

  return (
    <>
      {isModalOpen && (
        <Modal
          onStartSession={() => startSession(username)}
          onUsernameChange={(name) =>
            !!name ? setUsername(name) : setUsername(null)
          }
          username={username ?? ""}
        />
      )}
    </>
  );
};
