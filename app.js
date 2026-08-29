let peer = null;
let currentCall = null;
let localStream = null;
let contacts = JSON.parse(localStorage.getItem('carena_contacts')) || [];

const myIdDisplay = document.getElementById('my-id');
const myNameInput = document.getElementById('my-name-input');
const statusDisplay = document.getElementById('status');
const endBtn = document.getElementById('end-btn');
const remoteAudio = document.getElementById('remote-audio');
const contactsList = document.getElementById('contacts-list');
const activeCallInfo = document.getElementById('active-call-info');

document.addEventListener('DOMContentLoaded', () => {
  const savedName = localStorage.getItem('carena_user_name');
  if (savedName) myNameInput.value = savedName;
  renderContacts();
  initPeer();
});

function saveMyName() {
  const name = myNameInput.value.trim();
  if (name) {
    localStorage.setItem('carena_user_name', name);
    alert('Nom enregistré avec succès !');
  }
}

function initPeer() {
  const hostIp = '192.168.43.1';
  peer = new Peer({ host: hostIp, port: 9000, path: '/carena' });

  peer.on('open', (id) => {
    myIdDisplay.innerText = id;
    statusDisplay.innerText = "Prêt (Mode Local)";
  });

  peer.on('error', (err) => {
    console.error(err);
    statusDisplay.innerText = "Erreur : " + err.type;
  });

  peer.on('call', (call) => {
    const callerName = findContactName(call.peer) || call.peer;
    if (confirm(`Appel entrant de : ${callerName}. Répondre ?`)) {
      statusDisplay.innerText = "Connexion...";
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          localStream = stream;
          call.answer(stream);
          currentCall = call;
          call.on('stream', (remoteStream) => handleRemoteStream(remoteStream, callerName));
          call.on('close', () => resetCallState("Appel terminé"));
        })
        .catch(() => alert("Accès micro refusé"));
    } else {
      call.close();
    }
  });
}

function callContact(targetId, targetName) {
  statusDisplay.innerText = "Appel de " + targetName + "...";
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then((stream) => {
      localStream = stream;
      const call = peer.call(targetId, stream);
      currentCall = call;
      call.on('stream', (remoteStream) => handleRemoteStream(remoteStream, targetName));
      call.on('close', () => resetCallState("Appel terminé"));
    })
    .catch(() => alert("Accès micro refusé"));
}

function handleRemoteStream(remoteStream, callerName) {
  remoteAudio.srcObject = remoteStream;
  remoteAudio.play().catch(e => console.error(e));
  statusDisplay.innerText = "En communication";
  activeCallInfo.innerText = "En ligne avec : " + callerName;
  activeCallInfo.style.display = "block";
  endBtn.disabled = false;
}

function endCall() {
  if (currentCall) currentCall.close();
  resetCallState("Appel coupé");
}

function resetCallState(message) {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (remoteAudio.srcObject) remoteAudio.srcObject = null;
  currentCall = null;
  statusDisplay.innerText = message || "En attente";
  activeCallInfo.style.display = "none";
  endBtn.disabled = true;
}

function addContact() {
  const nameInput = document.getElementById('contact-name');
  const idInput = document.getElementById('contact-id');
  const name = nameInput.value.trim();
  const id = idInput.value.trim();
  if (!name || !id) return alert('Champs requis');
  contacts.push({ name, id });
  localStorage.setItem('carena_contacts', JSON.stringify(contacts));
  nameInput.value = ''; idInput.value = '';
  renderContacts();
}

function deleteContact(index) {
  contacts.splice(index, 1);
  localStorage.setItem('carena_contacts', JSON.stringify(contacts));
  renderContacts();
}

function renderContacts() {
  contactsList.innerHTML = '';
  if (contacts.length === 0) {
    contactsList.innerHTML = '<li style="color:#64748b;">Aucun contact</li>';
    return;
  }
  contacts.forEach((contact, index) => {
    const li = document.createElement('li');
    li.className = 'contact-item';
    li.innerHTML = `
      <div class="contact-info"><strong>${contact.name}</strong><small>ID: ${contact.id}</small></div>
      <div class="contact-actions">
        <button class="btn-call" onclick="callContact('${contact.id}', '${contact.name}')">📞 Appeler</button>
        <button class="btn-del" onclick="deleteContact(${index})">❌</button>
      </div>`;
    contactsList.appendChild(li);
  });
}

function findContactName(id) {
  const match = contacts.find(c => c.id === id);
  return match ? match.name : null;
}
