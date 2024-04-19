const APIKEY = `43068170-4c32ec2c832ce813017753a5d`;
const BASEURL = `https://pixabay.com/api/`;

function init() {
  addListeners();
}

import {
  FaceDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

let imgDetector = null;
let latestSearchResults = null;

function addListeners() {
  // handle user picking an image
  document.getElementById("results").addEventListener("click", showPickedImage);
  // handle search settings change
  document.getElementById("btnSettings").addEventListener("click", function () {
    document.getElementById("searchSettingsDialog").showModal();
  });
  // Save and close settings dialog
  document
    .getElementById("closeSettings")
    .addEventListener("click", function () {
      document.getElementById("searchSettingsDialog").close();
    });
  document.getElementById("btnSaved").addEventListener("click", function () {
    clearResults();
    displayCachedImages();
  });
  document.getElementById("btnResults").addEventListener("click", function () {
    displaySearchResults(latestSearchResults); // Display the latest search results
  });
}

// Update search listener to account for custom parameters
document
  .getElementById("btnRunSearch")
  .addEventListener("click", function (ev) {
    // Get the desired parameters via form input
    let imageType = document.getElementById("image_type").value.trim();
    let orientation = document.getElementById("orientation").value.trim();
    let category = document.getElementById("category").value.trim();
    let per_page = document.getElementById("per_page").value.trim();

    // Pass the parameters to the search function
    runSearch(ev, {
      imageType: imageType,
      orientation: orientation,
      category: category,
      per_page: per_page,
    });
  });

function runSearch(ev, settings) {
  ev.preventDefault();
  let keyword = document.getElementById("keyword").value;
  let url = new URL(BASEURL);
  // use default search parameters if no settings present
  url.searchParams.append(`key`, APIKEY);
  if (settings === null) {
    url.searchParams.append(`image_type`, `photo`);
    url.searchParams.append(`orientation`, `horizontal`);
    url.searchParams.append(`category`, `people`);
    url.searchParams.append(`order`, `popular`);
    url.searchParams.append(`per_page`, `30`);
  } else {
    url.searchParams.set("image_type", settings.imageType);
    url.searchParams.set("orientation", settings.orientation);
    url.searchParams.set("category", settings.category);
    url.searchParams.set("per_page", settings.per_page);
  }

  url.searchParams.append(`q`, keyword); // search query
  console.log(url.searchParams.toString());
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Fetch error", response.statusText);
      document.getElementById("canvasContainer").innerHTML = "";
      return response.json();
    })
    .then((data) => {
      console.log(data);
      displaySearchResults(data);
    })
    .catch((err) => {
      console.log(err.message);
    });
}

function displaySearchResults(data) {
  latestSearchResults = data;
  let results = document.querySelector("#results");
  if (!data || !data.hits) {
    document.getElementById("saved").innerHTML = "";
    document.getElementById("canvasContainer").innerHTML = "";
    results.innerHTML = "<h2>No Search Results.</h2>";
    return;
  }
  results.className = "search-results";
  history.pushState({ data: data, section: "results" }, "", "#results");
  window.location.hash = "results";

  // Create a document fragment to store the generated HTML
  let fragment = document.createDocumentFragment();

  if (data.hits.length === 0) {
    results.innerHTML = "<h2>No Search Results.</h2>";
    return;
  }

  // Iterate through the data.hits array and generate HTML for each result
  data.hits.forEach(
    ({ previewURL, id, tags, previewWidth, previewHeight, largeImageURL }) => {
      let div = document.createElement("div");
      div.classList.add("card");
      div.setAttribute("data-ref", id);
      div.setAttribute("data-full", largeImageURL);
      div.setAttribute("data-tags", tags);

      let img = document.createElement("img");
      img.className = "resultImg";
      img.src = previewURL;
      img.alt = `${tags} photo`;
      img.width = previewWidth;
      img.height = previewHeight;

      div.appendChild(img);
      fragment.appendChild(div);
    }
  );

  // Clear the existing content and append the document fragment
  results.innerHTML = "";
  saved.innerHTML = "";
  results.appendChild(fragment);

  // Add event listeners to the newly created card elements
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    card.addEventListener("click", showPickedImage);
  });
}

// Function to display full-sized image in dialog, with close and save buttons
function showPickedImage(event) {
  let dialog = document.getElementById("imgDialog");
  const largeImageUrl = event.target.closest(".card").getAttribute("data-full");
  const tags = event.target.closest(".card").getAttribute("data-tags");
  dialog.innerHTML = `<div class="dialogContent">
    <img id="largeImg" src="${largeImageUrl}" alt="${tags}">
    <div id="dialogButtons"><button class="closeDialog btnRed">Close</button>
    <button class="saveImage btnBlue">Save</button></div>
    <small id="saveText"></small></div>`;
  dialog.querySelector(".closeDialog").addEventListener("click", closeDialog);
  dialog.querySelector(".saveImage").addEventListener("click", savetoCache);
  dialog.showModal();
}

//Save dialog image to cache as a blob
function savetoCache() {
  const largeImgElement = document.getElementById("largeImg");
  const imageUrl = largeImgElement.src;
  const saveText = document.getElementById("saveText");

  fetch(imageUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Response not ok");
      }
      return response.blob();
    })
    .then((blob) => {
      caches
        .open("image-cache")
        .then((cache) => {
          cache.put(imageUrl, new Response(blob));
          console.log("Image saved to cache");
          saveText.textContent = "Image saved";
        })
        .catch((error) => {
          console.log("Image not saved to cache"(error));
        });
    })
    .catch((error) => {
      console.log("Other cache-related error"(error));
    });
}

// Function to close dialogs

function closeDialog() {
  const dialog = document.getElementById("imgDialog");
  const cacheDialog = document.getElementById("cacheDialog");

  if (dialog.open) {
    dialog.close();
  }

  if (cacheDialog.open) {
    cacheDialog.close();
  }
}

// Functions for clearing and displaying saved cache data

function clearResults() {
  document.getElementById("results").innerHTML = "";
}

function displayCachedImages() {
  let savedContainer = document.getElementById("saved");
  history.pushState({ section: "saved" }, "", "#saved");
  // Prevent duplicate images
  while (savedContainer.firstChild) {
    savedContainer.removeChild(savedContainer.firstChild);
  }
  window.location.hash = "saved";
  caches
    .open("image-cache")
    .then((cache) => {
      return cache.keys().then((keys) => {
        return Promise.all(
          keys.map((request) => {
            return cache.match(request.url).then((response) => {
              if (response) {
                const img = document.createElement("img");
                img.src = request.url;
                img.alt = "Saved image";
                img.classList.add("savedImg");
                const cacheImgCard = document.createElement("div");
                cacheImgCard.classList.add("cacheCard");
                cacheImgCard.appendChild(img);

                document.getElementById("saved").appendChild(cacheImgCard);

                img.addEventListener("click", function () {
                  showCacheDialog(request.url);
                });
              }
            });
          })
        );
      });
    })
    .catch((error) => {
      console.log("Cannot display cached images"(error));
    });
}

// Function for opening dialog of cached image, with close and delete buttons

async function showCacheDialog(imageUrl) {
  document.getElementById("canvasContainer").innerHTML = "";
  const dialog = document.getElementById("cacheDialog");
  // Detect faces in image
  let detections;
  const imgElement = new Image();
  imgElement.crossOrigin = "anonymous";
  imgElement.src = imageUrl;
  imgElement.onload = async function () {
    detections = await imgDetector.detect(imgElement);
    console.log(detections);
    let detectText = "";
    let score = 0;
    if (detections && detections.detections.length > 0) {
      detections.detections.forEach((detection, index) => {
        if (detection.categories[0]) {
          score = detection.categories[0].score;
          console.log(score);
          if (score > 0.3) {
            detectText += `Face ${index + 1}: Detected with ${(
              score * 100
            ).toFixed(2)}% confidence. `;
            // Draw facial features on image
            drawFacialFeatures(imgElement, detection, index, score);
          } else if (score <= 0.3) {
            detectText += `Face ${
              index + 1
            }: Low confidence in face detection. `;
          }
        } else {
          detectText += `Face ${index + 1}: No faces detected in image. `;
        }
      });
      if (detections.detections.length === 1) {
        detectText = `Face detected with ${(score * 100).toFixed(
          2
        )}% confidence.`;
      }
    } else {
      detectText = "No faces detected in image.";
    }
    //Create HTML content for dialog
    dialog.innerHTML = `
  <div class="dialogContent">
    <img id="cacheDialogImg" src="${imageUrl}" alt="Saved Image"/>
  </div>
  <div id="cacheDialogButtons">
  <button class="closeBtn btnBlue">Close</button>
  <button class="deleteBtn btnRed">Delete</button>
  </div>
  <p class="dialogText">${detectText}</p>
`;
    dialog.querySelector(".closeBtn").addEventListener("click", closeDialog);
    dialog.querySelector(".deleteBtn");
    dialog.querySelector(".deleteBtn").addEventListener("click", function () {
      deleteFromCache(imageUrl);
      document.getElementById("canvasContainer").innerHTML = "";
      closeDialog();
    });
  };
  dialog.showModal();
}

// Load the face detection model
async function detectInit() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  imgDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
    },
    scoreThreshold: 0.3,
    runningMode: "IMAGE",
  });
  init();
}

window.addEventListener("DOMContentLoaded", detectInit);

// Popstate for History API

window.addEventListener("popstate", function (event) {
  if (event.state) {
    if (event.state.section === "results") {
      displaySearchResults(event.state.data);
    } else if (event.state.section === "saved") {
      displayCachedImages();
    }
  }
});

//Function that deletes image from cache after pressing delete button

function deleteFromCache(imageUrl) {
  caches
    .open("image-cache")
    .then((cache) => {
      cache
        .match(imageUrl)
        .then((response) => {
          if (response) {
            cache.delete(imageUrl);
            let imgThumb = document.querySelector(`img[src="${imageUrl}"]`);
            if (imgThumb) {
              imgThumb.parentNode.removeChild(imgThumb);
            }

            // Remove duplicate images from 'saved'

            let imageContainer = document.getElementById("saved");
            while (imageContainer.firstChild) {
              imageContainer.removeChild(imageContainer.firstChild);
            }

            displayCachedImages();
          }
        })
        .catch((error) => {
          console.log("Error matching image in cache:", error);
        });
    })
    .catch((error) => {
      console.log("Error opening cache:", error);
    });
}

// Function for adding face detection visuals
function drawFacialFeatures(img, face, index, score) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0, img.width, img.height);

  // Draw bounding box
  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 4;
  ctx.strokeRect(
    face.boundingBox.originX,
    face.boundingBox.originY,
    face.boundingBox.width,
    face.boundingBox.height
  );

  // Draw facial landmarks
  face.keypoints.forEach((landmark) => {
    ctx.fillStyle = "#00ff00";
    ctx.beginPath();
    const x = landmark.x * img.width;
    const y = landmark.y * img.height;
    const radius = 5;
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Add heading identifying face
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#ff0000";
  ctx.font = "bold 50px Arial";
  ctx.fillText(
    `Face ${index + 1}: ${(score * 100).toFixed(2)}% Confidence`,
    10,
    50
  );
  ctx.strokeText(
    `Face ${index + 1}: ${(score * 100).toFixed(2)}% Confidence`,
    10,
    50
  );

  document.getElementById("canvasContainer").appendChild(canvas);
}

window.addEventListener("DOMContentLoaded", detectInit);
