import Docker from "dockerode";
import type { DockerStatus } from "../types";

export const docker = new Docker({ socketPath: "/var/run/docker.sock" });

export function mapDockerState(state: string): DockerStatus {
    if (state === "running") return "running";
    if (state === "paused") return "paused";
    return "stopped";
}

export async function getContainerByDockerName(dockerName: string) {
    const containers = await docker.listContainers({ all: true });
    for (const c of containers) {
        for (const name of c.Names || []) {
            const n = name.replace(/^\//, "");
            if (n === dockerName || n.endsWith("_" + dockerName) || n.endsWith("_" + dockerName + "_1")) {
                return docker.getContainer(c.Id);
            }
        }
    }
    return null;
}
