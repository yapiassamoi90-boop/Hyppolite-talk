let peer = null;
let currentCall = null;
let incomingCallInstance = null;
let localStream = null;
let contacts = JSON.parse(localStorage.getItem('carena_contacts')) || [];

const myIdDisplay = document.getElementById('my-id');
const myNameInput = document.getElementById('my-name-input');
const statusDisplay = document.getElementById('status');
const endBtn = document.getElementById('end-btn');
const remoteAudio = document.getElementById('remote-audio');
const contactsList = document.getElementById('contacts-list');
const activeCallInfo = document.getElementById('active-call-info');

const incomingModal = document.getElementById('incoming-call-modal');
const incomingCallerName = document.getElementById('incoming-caller-name');
const ringtoneAudio = document.getElementById('ringtone-audio');

document.addEventListener('DOMContentLoaded', () => {
  const savedName = localStorage.getItem('carena_user_name');
  if (savedName) myNameInput.value = savedName;
  renderContacts();
  initPeer();
});

function saveMyName() {
  const name = myNameInput.value.trim().toLowerCase();
  if (name) {
    localStorage.setItem('carena_user_name', name);
    myNameInput.value = name;
    alert('Nom enregistré ! Reconnexion avec ton nouveau pseudo...');
    if (peer) peer.destroy();
    initPeer();
  } else {
    alert('Entre un nom valide');
  }
}

function initPeer() {
  statusDisplay.innerText = "Initialisation...";
  const savedName = localStorage.getItem('carena_user_name');
  
  if (!savedName) {
    statusDisplay.innerText = "En attente d'un nom...";
    myIdDisplay.innerText = "Non défini";
    return;
  }

  peer = new Peer(savedName, {
    debug: 2
  });

  peer.on('open', (id) => {
    myIdDisplay.innerText = id;
    statusDisplay.innerText = "Prêt (Connecté)";
  });

  peer.on('error', (err) => {
    console.error(err);
    if (err.type === 'unavailable-id') {
      statusDisplay.innerText = "Erreur : Ce nom est déjà pris !";
      alert("Ce nom est déjà utilisé sur le réseau. Choisis-en un autre.");
    } else {
      statusDisplay.innerText = "Erreur : " + err.type;
    }
  });

  peer.on('call', (call) => {
    incomingCallInstance = call;
    const callerName = findContactName(call.peer) || call.peer;
    
    incomingCallerName.innerText = callerName;
    incomingModal.style.display = 'flex';
    
    ringtoneAudio.play().catch(e => console.log("Lecture audio bloquée :", e));
    if (navigator.vibrate) navigator.vibrate([500, 500, 500, 500]);
  });
}

function answerIncomingCall() {
  stopRingtone();
  incomingModal.style.display = 'none';
  statusDisplay.innerText = "Connexion...";

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then((stream) => {
      localStream = stream;
      incomingCallInstance.answer(stream);
      currentCall = incomingCallInstance;
      
      currentCall.on('stream', (remoteStream) => handleRemoteStream(remoteStream, incomingCallerName.innerText));
      currentCall.on('close', () => resetCallState("Appel terminé"));
    })
    .catch(() => {
      alert("Accès micro refusé");
      incomingCallInstance.close();
      resetCallState("Prêt (Connecté)");
    });
}

function rejectIncomingCall() {
  stopRingtone();
  incomingModal.style.display = 'none';
  if (incomingCallInstance) {
    incomingCallInstance.close();
    incomingCallInstance = null;
  }
  statusDisplay.innerText = "Prêt (Connecté)";
}

function stopRingtone() {
  ringtoneAudio.pause();
  ringtoneAudio.currentTime = 0;
  if (navigator.vibrate) navigator.vibrate(0);
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
    .catch((err) => {
      console.error(err);
      alert("Erreur micro ou appel impossible");
      resetCallState("Prêt (Connecté)");
    });
}

function handleRemoteStream(remoteStream, callerName) {
  stopRingtone();
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
  stopRingtone();
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (remoteAudio.srcObject) remoteAudio.srcObject = null;
  currentCall = null;
  incomingCallInstance = null;
  incomingModal.style.display = 'none';
  statusDisplay.innerText = message || "Prêt (Connecté)";
  activeCallInfo.style.display = "none";
  endBtn.disabled = true;
}

function addContact() {
  const nameInput = document.getElementById('contact-name');
  const idInput = document.getElementById('contact-id');
  const name = nameInput.value.trim();
  const id = idInput.value.trim().toLowerCase();
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
    contactsList.innerHTML = '<li style="color:#64748b; text-align:center; padding:10px;">Aucun contact</li>';
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
