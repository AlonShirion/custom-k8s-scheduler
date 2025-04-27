const { NAMESPACE_NAME, SCHEDULER_NAME, bindPodToNode, getPriority } = require('./k8s-utils');

async function getGangPods(k8sApi, basePod) {
  const ownerUid = basePod.metadata.ownerReferences?.[0]?.uid;
  if (!ownerUid) return null;

  const allPods = (await k8sApi.listNamespacedPod({ namespace: NAMESPACE_NAME })).items;

  const gang = allPods.filter(
    (p) =>
      p.metadata.ownerReferences?.[0]?.uid === ownerUid && p.spec.schedulerName === SCHEDULER_NAME && !p.spec.nodeName
  );

  return gang;
}

async function tryGangSchedule(gangPods, nodes, allPods, schedulingLocks) {
  const availableNodes = nodes.filter((node) => {
    const nodeName = node.metadata.name;
    const isUsed = allPods.some((p) => p.spec.nodeName === nodeName && p.spec.schedulerName === SCHEDULER_NAME);
    return !isUsed && !schedulingLocks.has(nodeName);
  });

  if (availableNodes.length < gangPods.length) {
    return false;
  }

  console.log(`Scheduling gang of ${gangPods.length} pods for job '${gangPods[0].metadata.ownerReferences[0].name}'`);

  for (let i = 0; i < gangPods.length; i++) {
    const pod = gangPods[i];
    const node = availableNodes[i];
    const nodeName = node.metadata.name;

    schedulingLocks.add(nodeName);
    console.log(`Locking node '${nodeName}' for pod '${pod.metadata.name}'`);

    try {
      await bindPodToNode(pod, node);
    } finally {
      schedulingLocks.delete(nodeName);
      console.log(`Unlocking node '${nodeName}'`);
    }
  }

  return true;
}

async function tryGangPreempt(gangPods, allPods, k8sApi) {
  const gangPriority = getPriority(gangPods[0]);
  const neededCount = gangPods.length;

  // Find currently used nodes by lower-priority pods
  const victims = allPods
    .filter((p) => p.spec.nodeName && p.spec.schedulerName === SCHEDULER_NAME && getPriority(p) < gangPriority)
    .sort((a, b) => getPriority(a) - getPriority(b)); // lowest priority first

  // If not enough low-priority pods to evict, do nothing
  if (victims.length < neededCount) {
    console.log(`Not enough low-priority pods to evict for gang preemption`);
    return false;
  }

  console.log(
    `Preempting ${neededCount} low-priority pods for gang job '${gangPods[0].metadata.ownerReferences?.[0]?.name}'`
  );

  for (let i = 0; i < neededCount; i++) {
    const pod = victims[i];
    console.log(`Evicting pod '${pod.metadata.name}' (priority ${getPriority(pod)})`);
    await k8sApi.deleteNamespacedPod({
      name: pod.metadata.name,
      namespace: NAMESPACE_NAME,
    });
  }

  return true;
}

function isGangLeader(pod, gangPods) {
  const sorted = [...gangPods].sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
  return pod.metadata.name === sorted[0].metadata.name;
}

module.exports = {
  getGangPods,
  tryGangSchedule,
  tryGangPreempt,
  isGangLeader,
};
