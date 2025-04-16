// Import the CSS styles for the application.
import './style.css'

// Import the Agora RTC SDK for real-time communications.
import AgoraRTC from "agora-rtc-sdk-ng"

// Import the App ID from an external file, which is required to initialize the Agora service.
import appid from '../appId';

// Set the token to null (assuming no token authentication is used here).
const token = null

// Create a random user ID (rtcUid) by generating a random number.
// The maximum value is 2032, which provides a unique identifier for the user.
const rtcUid = Math.floor(Math.random() * 2032)

// Define the room ID (in this case, "main") where the audio call will take place.
let roomId = "main"

// Object to hold audio tracks for both local user and remote users.
// localAudioTrack will store our microphone track.
// remoteAudioTracks will be an object storing remote audio tracks keyed by user ID.
let audioTracks = {
  localAudioTrack: null,
  remoteAudioTracks: {},
};

// Declare a variable for the Agora RTC client instance.
let rtcClient;

// Define an asynchronous function to initialize the RTC client.
const initRtc = async () => {

  // Create an RTC client with specific parameters:
  // - mode: "rtc" indicates real-time communications mode.
  // - codec: "vp8" specifies the video codec, though in this example only audio is used.
  rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  // Set up event listeners on the RTC client:
  // When another user joins, publish media or leaves, specific functions will be triggered.
  rtcClient.on('user-joined', handleUserJoined)
  rtcClient.on("user-published", handleUserPublished)
  rtcClient.on("user-left", handleUserLeft);
  
  initVolumeIndicator()

  // Join the RTC channel with the given App ID, room ID, token, and user ID.
  await rtcClient.join(appid, roomId, token, rtcUid)

  // Create an audio track from the user's microphone and store it.
  audioTracks.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  
  // Publish the local audio track so that other users in the channel can hear it.
  await rtcClient.publish(audioTracks.localAudioTrack);

  // Update the user interface:
  // Insert a new HTML element representing the current user into the "members" section.
  document.getElementById('members').insertAdjacentHTML('beforeend', `<div class="speaker user-rtc-${rtcUid}" id="${rtcUid}"><p>${rtcUid}</p></div>`)
}

// Get a reference to the lobby form element from the HTML.
let lobbyForm = document.getElementById('form')

// Define an asynchronous function to handle when a user enters the room.
const enterRoom = async (e) => {
  // Prevent the default form submission behavior (which would reload the page).
  e.preventDefault()
  
  // Initialize the RTC client and connect the user to the room.
  initRtc()

  // Hide the lobby form since the user is now entering the room.
  lobbyForm.style.display = 'none'
  
  // Display the room header (for example, to show that the call or room controls are now visible).
  document.getElementById('room-header').style.display = "flex"
}

// Attach an event listener to the lobby form to handle the "submit" event.
// When the form is submitted, the enterRoom function is executed.
lobbyForm.addEventListener('submit', enterRoom)

// Define an asynchronous function that handles leaving the room.
let leaveRoom = async () => {

  // Stop and close the local audio track to release microphone resources.
  audioTracks.localAudioTrack.stop()
  audioTracks.localAudioTrack.close()

  // Unpublish the local audio track from the channel.
  rtcClient.unpublish()
  
  // Leave the RTC channel.
  rtcClient.leave()

  // Update the UI to reflect that the user has left the room:
  // Show the lobby form again, hide the room header, and clear the list of members.
  document.getElementById('form').style.display = 'block'
  document.getElementById('room-header').style.display = 'none'
  document.getElementById('members').innerHTML = ''
}

// Add a click event listener to an element with the ID "leave-icon".
// When this element is clicked, the leaveRoom function is called to disconnect the user.
document.getElementById('leave-icon').addEventListener('click', leaveRoom)

// Function to handle a new user joining the room.
let handleUserJoined = async (user) => {
  // When a new user joins, add their info to the members list.
  // Create a new HTML element showing the user's RTC ID.
  document.getElementById('members').insertAdjacentHTML('beforeend', `<div class="speaker user-rtc-${user.uid}" id="${user.uid}"><p>${user.uid}</p></div>`)
} 

// Function to handle when a user publishes a media stream (e.g., audio).
let handleUserPublished = async (user, mediaType) => {
  // Subscribe to the user's published media track (audio in this case).
  await rtcClient.subscribe(user, mediaType);

  // If the media type is audio:
  if (mediaType == "audio"){
    // Add the user's audio track to the remoteAudioTracks object.
    audioTracks.remoteAudioTracks[user.uid] = [user.audioTrack]
    
    // Play the remote user's audio track so that you can hear them.
    user.audioTrack.play();
  }
}
  
// Function to handle when a user leaves the room.
let handleUserLeft = async (user) => {
  // Remove the user's audio track from the remoteAudioTracks object.
  delete audioTracks.remoteAudioTracks[user.uid]
  
  // Remove the corresponding HTML element from the members list.
  document.getElementById(user.uid).remove()
}



let initVolumeIndicator = async () => {

  //1
  AgoraRTC.setParameter('AUDIO_VOLUME_INDICATION_INTERVAL', 200);
  rtcClient.enableAudioVolumeIndicator();
  
  //2
  rtcClient.on("volume-indicator", volumes => {
    volumes.forEach((volume) => {
      console.log(`UID ${volume.uid} Level ${volume.level}`);

      //3
      try{
          let item = document.getElementsByClassName(`user-rtc-${volume.uid}`)[0]

         if (volume.level >= 50){
           item.style.borderColor = '#00ff00'
         }else{
           item.style.borderColor = "#fff"
         }
      }catch(error){
        console.error(error)
      }


    });
  })
}