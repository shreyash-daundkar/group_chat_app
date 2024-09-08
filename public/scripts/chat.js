const { origin }  = new URL(window.location);

const host = origin;



const chatBox = document.querySelector('.chat-box');
const groupList = document.querySelector('#group-list');
const sendChatBtn = document.querySelector('#send-chat-btn');
const chatInput = document.querySelector('#chat-input');
const imageInput = document.getElementById('image-input');
const chatHeading = document.querySelector('#chat-heading');
const newChatBtn = document.querySelector('#new-chat');
const oldChatBtn = document.querySelector('#old-chat');
const logoutBtn = document.querySelector('#logout-btn');



// authenticate

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
}
  
const token = getCookie('token');
if (token) {
    axios.defaults.headers.common['authorization'] = token;
} else {
    window.location.href = 'login.html';
}

logoutBtn.addEventListener('click', () => {
    document.cookie = `token=null`;
    window.location.href = 'login.html';
});




// socket 

const socket = io(host + '/group', { auth: { token }});

socket.on('error', data => {
    console.log(data);
})


groupList.addEventListener('click', (e) => {
    if(e.target.classList.contains('list-group-item')) loadChats(e, 'new-chats');
    if(e.target.classList.contains('edit')) editGroup(e);
    if(e.target.classList.contains('delete')) deleteGroup(e);
    if(e.target.classList.contains('leave')) leaveGroup(e);
});

//get chats

let selectedGroupId;

async function loadChats(e) { 

    const groupItems = document.querySelectorAll('#group-list .list-group-item');
    groupItems.forEach(item => item.classList.remove('active'));

    const selectedGroup = e.target;
    chatHeading.textContent = selectedGroup.children[0].textContent;
    selectedGroup.classList.add('active');

    selectedGroupId = selectedGroup.getAttribute('groupid');

    localStorage.setItem('new-chats', JSON.stringify([]));

    oldChatBtn.style.display = 'inline-block';
    newChatBtn.style.display = 'none';

    const { data: { data }} = await axios.get(host+ `/chat?groupId=${selectedGroupId}`);
    storeToLocalStorage(data, 'new-chats');
    
    const chats = JSON.parse(localStorage.getItem('new-chats'));
   
    chatBox.innerHTML = '';
    chats.forEach(chat => addChat(chat));

    socket.emit('join-chat-room', { groupId: selectedGroupId });
}


oldChatBtn.addEventListener('click', async () => {

    localStorage.setItem('old-chats', JSON.stringify([]));

    oldChatBtn.style.display = 'none';
    newChatBtn.style.display = 'inline-block';

    const { data: { data }} = await axios.get(host+ `/archived-chat?groupId=${selectedGroupId}`);
    storeToLocalStorage(data, 'old-chats');

    const chats = JSON.parse(localStorage.getItem('old-chats'));
   
    chatBox.innerHTML = '';
    chats.forEach(chat => addChat(chat));
});


newChatBtn.addEventListener('click', async () => {
    
    oldChatBtn.style.display = 'inline-block';
    newChatBtn.style.display = 'none';

    const chats = JSON.parse(localStorage.getItem('new-chats'));
   
    chatBox.innerHTML = '';
    chats.forEach(chat => addChat(chat));
})


function storeToLocalStorage(data, timeframe) {
    const chats = JSON.parse(localStorage.getItem(timeframe));

    while(data.length !== 0) {
        chats.push(data.shift());
    }

    localStorage.setItem(timeframe, JSON.stringify(chats));
}


function addChat(chat) {

    let { username , message, imageUrl, userId, date, time} = chat;
    const div = document.createElement('div');
    div.classList.add('message');
    if(userId === parseInt(localStorage.getItem('userId'))) {
        username = 'You';
        div.classList.add('user2');
    } else {
        div.classList.add('user1');
    }

    div.innerHTML = `<p><strong>${username}:</strong>`;

    if (message) {
        div.innerHTML += `<span id="msg">${message}</span>`
    }

    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.classList.add('received-image');
        img.setAttribute('onclick', `window.open('${imageUrl}', '_blank')`);
        div.append(img);
    }

    div.innerHTML += `<p id="date-time">${date}, ${time}</p></p><br>`;

    chatBox.append(div);   
}

function openImageInNewTab(imageUrl) {
  window.open(imageUrl, '_blank');
}


socket.on('received-chat', data => {
    try {
        const arr = [];
        arr.push(data.data)
    
        storeToLocalStorage(arr, 'new-chats');
    
        const chats = JSON.parse(localStorage.getItem('new-chats'));
    
        chatBox.innerHTML = '';
        chats.forEach(chat => addChat(chat));
        
    } catch (error) {
        console.log(error);
    }
});




//send chat 

sendChatBtn.addEventListener('click', async e => {
    e.preventDefault();
    const message = chatInput.value;

    if (selectedGroupId && (message || imageInput.files.length > 0)) {
        try {
            const data = {
                groupId: selectedGroupId,
                message: null,
                imageBuffer: null,
            }

            if (message) {
                data.message = message;
            }

            if (imageInput.files.length > 0) {

                const reader = new FileReader();
                reader.readAsArrayBuffer(imageInput.files[0]);

                reader.onload = (event) => {
                    data.imageBuffer = event.target.result;
                    socket.emit('send-chat', data);
                }
            } else {
                socket.emit('send-chat', data);
            }
            //const res = await axios.post(host + `/chat?groupId=${selectedGroupId}`, { message });
            chatInput.value = '';
            imageInput.value = '';

        } catch (error) {
            console.log(error.response.data.message);
        }
    }
});




// get groups

window.addEventListener('DOMContentLoaded', () => {
    loadGroups();
});

async function loadGroups() { 
    try {
        const { data: { data } } = await axios.get(host + '/group');
        groupList.innerHTML = '';
        data.forEach(group => addGroup(group));
    } catch (error) {
        console.log(error);
    }
}

function addGroup(group) {
    const { id, name, isAdmin} = group;
    const li = document.createElement('li');
    li.classList.add('list-group-item');
    li.innerHTML = isAdmin
         ? `<span>${name}</span>
         <button class="btn btn-sm float-right btn-danger ml-2 delete">Delete</button>
         <button class="btn btn-sm float-right btn-warning ml-2 edit">Edit</button>`
         : `<span>${name}</span>
            <button class="btn btn-sm float-right btn-danger ml-2 leave">Leave</button>`;
    li.setAttribute('groupId', id);
    groupList.append(li);
}




//create & edit group

let editGroupId = null;

async function editGroup(e) {
    editGroupId = e.target.parentNode.getAttribute('groupId');

    document.getElementById('groupName').value = e.target.parentNode.children[0].textContent;

    await loadUsers();
    await checkedExistingMembers();

    $('#createGroupModal').modal('show');
};

document.getElementById('showCreateGroupModalBtn').addEventListener('click', function () {
    
    editGroupId = null;
    loadUsers();

    $('#createGroupModal').modal('show');
});


async function loadUsers() {
    try {
      const { data: { data } } = await axios.get(host + '/user'); 
        const userList = document.getElementById('userList');

        userList.innerHTML = '';

        data.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'form-check';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.value = user.id;

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.innerHTML = user.username;

            userDiv.appendChild(checkbox);
            userDiv.appendChild(label);
            userList.appendChild(userDiv);
        });
    } catch (error) {
        console.log(error);
    }
}


async function checkedExistingMembers() {
    try {
        const userList = document.getElementById('userList');
        
        const { data: { data } } = await axios.get(host + `/group-member?groupId=${editGroupId}`);
        
        data.forEach(member => {
            if(member.isAdmin) return
            const checkbox = userList.querySelector(`input[value="${member.userId}"]`);
            checkbox.checked = true;
        });

    
        const adminForm = document.querySelector('#select-admin-form');
        adminForm.innerHTML = `<label for="adminSelect">Select Admin:</label>`;
        const adminSelect = document.createElement('select');
        adminSelect.classList.add('form-control');
        adminSelect.id = 'adminSelect';
        adminForm.append(adminSelect);
            

        adminSelect.innerHTML = '';

        data.forEach(member => {
            const option = document.createElement('option');
            option.value = member.userId;
            option.textContent = member.username;
            adminSelect.appendChild(option);
        });
        
        data.forEach(member => {
            if (member.isAdmin) {
                adminSelect.value = member.userId;
            }
        });

    } catch (error) {
        console.log(error);
    }
}


document.getElementById('createGroupForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const groupName = document.getElementById('groupName').value;
    const checkboxes = document.getElementsByClassName('form-check-input');
    
    const selectedMembers = Array.from(checkboxes).filter(checkbox => checkbox.checked).map(checkbox => parseInt(checkbox.value));

    const selectedAdmin = document.querySelector('#adminSelect');

    try {  
        if(editGroupId) {
            const data = {
                name: groupName,
                membersIds: selectedMembers,
                adminId: selectedAdmin.value,
            }

            console.log(data, editGroupId)

            const res = await axios.put(host + `/group?groupId=${editGroupId}`, data); 
            if (res.data.success) {
                $('#createGroupModal').modal('hide');
                loadGroups();
                editGroupId = null;
            }

        } else {
            const data = {
                name: groupName,
                membersIds: selectedMembers 
            }

            const res = await axios.post(host + '/group', data);
            if (res.data.success) {
                $('#createGroupModal').modal('hide');
                loadGroups();
            }
        }
    } catch (error) {
        console.log(error);
    }
});


// delete group

async function deleteGroup(e) {
    try {
        const groupId = e.target.parentNode.getAttribute('groupId');

        const { data: { success } } = await axios.delete(host + `/group?groupId=${groupId}`);
        if(success) loadGroups();
        
    } catch (error) {
        console.log(error)
    }
}


// leave group

async function leaveGroup(e) {
    try {
        const groupId = e.target.parentNode.getAttribute('groupId');

        const { data: { success } } = await axios.delete(`${host}/group-member?groupId=${groupId}`);

        if(success) {
            loadGroups();
            if(selectedGroupId === groupId) {
                chatBox.innerHTML = '';
                selectedGroupId = null; 
            }
        } 
    } catch (error) {
        console.log(error);
    }
}