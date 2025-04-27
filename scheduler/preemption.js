require('dotenv').config();
const { NAMESPACE_NAME, SCHEDULER_NAME, getPriority } = require('./k8s-utils');

/**
 * Attempt to find a lower-priority pod on a full node,
 * evict it, and return the node for scheduling.
 */
module.exports = async function tryPreempt(k8sApi, newPod) {
  const newPriority = getPriority(newPod);

  const nodeList = await k8sApi.listNode();
  const nodes = nodeList.items;

  const allPods = (await k8sApi.listNamespacedPod({ namespace: NAMESPACE_NAME })).items;

  for (const node of nodes) {
    const nodeName = node.metadata.name;

    const podOnNode = allPods.find(
      (p) =>
        p.spec.nodeName === nodeName &&
        p.metadata.name !== newPod.metadata.name &&
        p.spec.schedulerName === SCHEDULER_NAME
    );

    if (!podOnNode) continue;

    const existingPriority = getPriority(podOnNode);

    if (newPriority > existingPriority) {
      const ownerUid = podOnNode.metadata.ownerReferences?.[0]?.uid;

      if (ownerUid) {
        const gangPods = allPods.filter(
          (p) => p.metadata.ownerReferences?.[0]?.uid === ownerUid && p.spec.schedulerName === SCHEDULER_NAME
        );

        console.log(`⚠Preempting entire gang (job UID ${ownerUid}) of ${gangPods.length} pods`);

        for (const p of gangPods) {
          console.log(`Deleting pod '${p.metadata.name}' from job`);
          await k8sApi.deleteNamespacedPod({
            name: p.metadata.name,
            namespace: NAMESPACE_NAME,
          });
        }
      } else {
        console.log(`Preempting pod '${podOnNode.metadata.name}' on node '${nodeName}'`);
        await k8sApi.deleteNamespacedPod({
          name: podOnNode.metadata.name,
          namespace: NAMESPACE_NAME,
        });
      }

      return node;
    }
  }

  return null; // no node found for preemption
};
