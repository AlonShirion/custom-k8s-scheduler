require('dotenv').config();
const tryPreempt = require('./preemption');
const { getGangPods, tryGangSchedule, tryGangPreempt, isGangLeader } = require('./gang');
const { k8sApi, watch, SCHEDULER_NAME, NAMESPACE_NAME, shouldSchedule, bindPodToNode } = require('./k8s-utils');

// To avoid race condition of multiple pods
const schedulingLocks = new Set();

// Schedule a pod when it's added
async function schedulePod(pod) {
  try {
    const nodeList = await k8sApi.listNode();
    const nodes = nodeList.items;

    const podList = await k8sApi.listNamespacedPod({ namespace: NAMESPACE_NAME });
    const allPods = podList.items;

    // Gang scheduling block
    const gangPods = await getGangPods(k8sApi, pod);
    if (gangPods && gangPods.length > 0) {
      if (!isGangLeader(pod, gangPods)) {
        console.log(`Skipping gang scheduling for '${pod.metadata.name}', handled by gang leader.`);
        return;
      }

      const success = await tryGangSchedule(gangPods, nodes, allPods, schedulingLocks);
      if (success) return;

      const preempted = await tryGangPreempt(gangPods, allPods, k8sApi);
      if (preempted) {
        console.log(`Gang preemption complete. Waiting for job to recreate pods.`);
        return;
      }

      console.log(`Gang scheduling failed for job '${pod.metadata.ownerReferences?.[0]?.name}'`);
      return;
    }

    // One-pod-per-node fallback
    for (const node of nodes) {
      const nodeName = node.metadata.name;

      if (schedulingLocks.has(nodeName)) continue;

      const podsOnNode = allPods.filter(
        (p) =>
          p.spec.nodeName === nodeName &&
          p.metadata.name !== pod.metadata.name &&
          p.spec.schedulerName === SCHEDULER_NAME
      );

      if (podsOnNode.length === 0) {
        schedulingLocks.add(nodeName);
        console.log(`Locking node '${nodeName}' for pod '${pod.metadata.name}'`);

        try {
          await bindPodToNode(pod, node);
        } finally {
          schedulingLocks.delete(nodeName);
          console.log(`Unlocking node '${nodeName}'`);
        }

        return;
      }
    }

    // Fallback: try single-pod preemption
    const nodeToUse = await tryPreempt(k8sApi, pod);
    if (nodeToUse) {
      console.log(`Waiting before binding '${pod.metadata.name}' after preemption...`);
      setTimeout(() => bindPodToNode(pod, nodeToUse), 2000);
    } else {
      console.log(`No preemptable pods found for '${pod.metadata.name}'`);
    }
  } catch (err) {
    console.error(`Failed to schedule pod '${pod.metadata.name}':`, err.body || err);
  }
}

// 🕵️ Start watching for pod events
function startWatching() {
  watch
    .watch(
      `/api/v1/namespaces/${NAMESPACE_NAME}/pods`,
      {},
      (type, pod) => {
        if (type === 'ADDED' && shouldSchedule(pod)) {
          console.log(`Detected unscheduled pod: ${pod.metadata.name}`);
          schedulePod(pod);
        }
      },
      (err) => {
        console.error('Watch error:', err);
        setTimeout(startWatching, 3000);
      }
    )
    .then(() => {
      console.log('Watching for pending pods');
    })
    .catch((err) => {
      console.error('Failed to start watcher:', err);
    });
}

startWatching();
