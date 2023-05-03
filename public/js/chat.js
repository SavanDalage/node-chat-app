const socket = io();

// często używane elementy
const $buttonLocation = document.querySelector("#send-location");

const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $messages = document.querySelector("#messages");
const $link = document.querySelector("link");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sidebarTempate = document.querySelector("#sidebar-template").innerHTML;

// Options - pobiera dane z linku+
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  // nowe wiadomości
  const $newMessage = $messages.lastElementChild;

  // wysokość nowej wiadmości
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // widoczna wysokość
  const visibleHeight = $messages.offsetHeight;

  // wysokość kontenera wiadomości
  const containerHeight = $messages.scrollHeight;

  // jak daleko trzeba scrollować
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

// drukowanie wiadomości w oknie czatu
socket.on("message", (message, username) => {
  console.log(username);

  const html = Mustache.render(messageTemplate, {
    username,
    message: message.text,
    createAt: moment(message.createAt).format("LTS"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

// drukowanie lokalizacji w oknie czatu
socket.on("locationMessage", (message, username) => {
  console.log(message);
  const html = Mustache.render(locationTemplate, {
    usernameL: username[0],
    locationURL: message.url,
    createAt: moment(message.createAt).format("LTS"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

// dane do sidebar
socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTempate, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

$buttonLocation.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser.");
  }

  $buttonLocation.setAttribute("disable", "disable");

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        console.log("The location was shared");
        $buttonLocation.removeAttribute("disable");
      }
    );
  });

  socket.emit();
});

$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  //   let message = document.querySelector("input").value;

  $messageFormButton.setAttribute("disabled", "disabled");
  // disable
  let message = e.target.elements.message.value;

  socket.emit("sendMessage", message, (sys) => {
    $messageFormButton.removeAttribute("disabled");
    // enable
    $messageFormInput.value = "";
    $messageFormInput.focus();
    // clearing

    if (sys) {
      return console.log(sys);
    }
    console.log("The message was delivered");
  });
});

// emitujemy zdarzenie dołączenia do - wysyła też callback
socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
