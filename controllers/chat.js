const { getChats, addChat } = require('../services/chat');
const { storeInS3 } = require('../services/awsS3');


exports.getChats = async (req, res, next) => {
    try {
        const groupId = parseInt(req.query.groupId);

        let chats = await getChats({ groupId });
        
        let chatsData = [];
        if(chats.length !== 0) {
            
            chatsData = chats.map(chat => {
                const { id, message, imageUrl, userId, user, createdAt } = chat;
                return { 
                    id,
                    message,
                    imageUrl,
                    userId,
                    username: user.username,
                    date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    time: createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                }
            });
        }

        res.status(200).json({ data: chatsData, success: true });
    } catch (error) {
        next(error);
    }
}

exports.addChat = async (groupNamespace, socket, data) => {
    try {
        const { groupId, message, imageBuffer } = data;

        if (!message && !imageBuffer) return;

        const options = {
            groupId,
            imageUrl: null,
            message: message || null,
            userId: socket.user.id,
        }

        if (imageBuffer) {
            
            const fileName = `Group-chat-media/${groupId}/${socket.user.id}/${new Date().toISOString()}.jpg`;
            const imageData = Buffer.from(imageBuffer);

            options.imageUrl = await storeInS3(fileName, imageData);
        }

        const { id, createdAt } = await addChat(options);
            
        return groupNamespace.to(data.groupId).emit('received-chat', { data: {
            id,
            username: socket.user.username,
            ...options,
            date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        }, success: true });
        
    } catch (error) {
        console.error(error.stack);
        return socket.emit('error', { message: 'Error sending chat', success: false });
    }
}