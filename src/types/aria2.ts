export interface Aria2Request<T = unknown[]> {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params: T;
}

export interface Aria2Response<T = unknown> {
  jsonrpc: "2.0";
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface Aria2Task {
  gid: string;
  status: "active" | "waiting" | "paused" | "error" | "complete" | "removed";
  totalLength: string;
  completedLength: string;
  uploadLength: string;
  downloadSpeed: string;
  uploadSpeed: string;
  /** Hex bitfield of completed pieces (present on BT tasks). */
  bitfield?: string;
  pieceLength?: string;
  numPieces?: string;
  infoHash?: string;
  /** True when the task is only seeding (BT). */
  seeder?: string;
  numSeeders?: string;
  connections?: string;
  errorCode?: string;
  errorMessage?: string;
  followedBy?: string[];
  following?: string;
  belongsTo?: string;
  dir: string;
  files?: Aria2File[];
  bittorrent?: unknown;
}

export interface Aria2File {
  index: string;
  path: string;
  length: string;
  completedLength: string;
  selected: "true" | "false";
  uris?: { status: string; uri: string }[];
}

export interface Aria2GlobalStat {
  downloadSpeed: string;
  uploadSpeed: string;
  numActive: string;
  numWaiting: string;
  numStopped: string;
  numStoppedTotal: string;
}

/**
 * aria2 stringifies every RPC field, including booleans ("true"/"false")
 * — verified against real 1.37.0 responses in src/mocks/fixtures.ts.
 */
export interface Aria2Peer {
  peerId: string;
  ip: string;
  port: string;
  bitfield: string;
  amChoking: string;
  peerChoking: string;
  downloadSpeed: string;
  uploadSpeed: string;
  seeder: string;
  client?: string;
}

/** Full task status from aria2.tellStatus (superset of tellActive rows). */
export interface Aria2TaskStatus extends Aria2Task {
  verifiedLength?: string;
  verifyPending?: string;
  infoHashV1?: string;
  infoHashV2?: string;
  /** Verified bytes while hashing; present on BT tasks. */
  bittorrent?: Aria2Bittorrent;
}

/** bittorrent object shape from tellStatus (names kept as aria2 reports). */
export interface Aria2Bittorrent {
  info?: { name?: string };
  announceList?: string[][];
  comment?: string;
  creationDate?: number;
  mode?: "single" | "multi";
}
