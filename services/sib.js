const Sib = require('sib-api-v3-sdk');



exports.sendMail = async options => {
    try {
        const { email, forgotPasswordId } = options; 
    
        const client = Sib.ApiClient.instance;
        const apiKey = client.authentications['api-key'];
        apiKey.apiKey = process.env.SIB_API;
        
        const transEmailApi = new Sib.TransactionalEmailsApi();

        console.log(transEmailApi)
    
        const sender = {
            email: process.env.SIB_SENDER_EMAIL,
            name: process.env.SIB_SENDER_NAME,
        }
    
        const receivers = [ { email } ];

        const a = await transEmailApi.sendTransacEmail({
            sender,
            to: receivers,
            subject: 'Forget Password',
            textContent: `http://${process.env.HOST}:${process.env.PORT}/reset-password.html?id=${forgotPasswordId}`,
        });  

        console.log(a)


        return;
    } catch (error) {
        throw error; 
    }

}