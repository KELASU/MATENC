// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.sendForumPostNotification = functions
    .region("asia-southeast1") // Optional: Specify region
    .firestore.document("forumPosts/{postId}")
    .onCreate(async (snapshot, context) => {
      const newPost = snapshot.data();
      const postId = context.params.postId;

      console.log(
          `New post: ${postId}, Data: ${JSON.stringify(newPost)}`,
      );

      if (!newPost || !newPost.userId || !newPost.title) {
        console.log("Incomplete post data. Aborting.");
        return null;
      }

      let usersSnapshot;
      try {
        usersSnapshot = await db
            .collection("users")
            .where("notificationSettings.newForumPosts", "==", true)
            .get();
      } catch (error) {
        console.error("Error fetching users:", error);
        return null;
      }

      if (usersSnapshot.empty) {
        console.log("No users for forum post notifications.");
        return null;
      }

      const tokensToNotify = [];
      const userIdsNotified = [];

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.uid === newPost.userId) {
          console.log(`Skipping author: ${newPost.userId}`);
          return;
        }
        if (userData.expoPushToken) {
          tokensToNotify.push(userData.expoPushToken);
          userIdsNotified.push(userData.uid);
        } else {
          console.log(`User ${userData.uid} no token.`);
        }
      });

      if (tokensToNotify.length === 0) {
        console.log("No valid tokens found (excluding author).");
        return null;
      }

      console.log(
          `Found ${tokensToNotify.length} tokens for users: ` +
      userIdsNotified.join(", "),
      );

      const messageTitle = "New Matenc Forum Post!";
      let msgBody = newPost.content || "Check out the latest discussion.";
      if (msgBody.length > 100) {
        msgBody = msgBody.substring(0, 97) + "...";
      }

      // Line 77 area: Further break down fullMessageBody construction
      const userDisplay = newPost.username || "Someone";
      const postTitle = newPost.title;
      let fullMessageBody = `${userDisplay} posted: "${postTitle}`;
      fullMessageBody += ` - ${msgBody}"`;


      const messages = tokensToNotify.map((tokenParam) => ({
        token: tokenParam,
        notification: {
          title: messageTitle,
          body: fullMessageBody,
        },
        data: {
          screen: `/Main_pages/ForumPost/${postId}`,
          postId: postId,
        },
        android: {
          priority: "high",
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      }));

      console.log(`Sending ${messages.length} messages.`);

      try {
        const response = await admin.messaging().sendEach(messages);
        console.log("Sent messages:", response.successCount);

        if (response.failureCount > 0) {
          console.log(`Failures: ${response.failureCount}`);
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const uId = userIdsNotified[idx];
              const failedTokenShort = tokensToNotify[idx].substring(0, 15);
              let errorStr = "Unknown error";
              if (resp.error && resp.error.code) {
                errorStr = resp.error.code;
              } else if (resp.error) {
                errorStr = JSON.stringify(resp.error).substring(0, 20) + "...";
              }
              // Line 110 area: Further break down console.error
              console.error(
                  `Send fail (User: ${uId}, Token: ${failedTokenShort}...):`,
                  errorStr,
              );

              if (
                resp.error &&
              (resp.error.code ===
                "messaging/registration-token-not-registered" ||
                resp.error.code ===
                "messaging/invalid-registration-token" ||
                resp.error.code ===
                "messaging/mismatched-credential")
              ) {
                console.log(
                    `Invalid token for user ${uId}. Consider removal.`,
                );
              // db.collection('users').doc(uId)
              //   .update({
              //      expoPushToken:
              //          admin.firestore.FieldValue.delete(),
              //   });
              }
            }
          });
        }
      } catch (error) {
        let errorMsg = "Error sending pushes.";
        if (error && error.message) {
          errorMsg = error.message.substring(0, 50);
        }
        console.error(errorMsg, error);
      }
      return null;
    });
// Ensure there's a newline character at the very end of this file
