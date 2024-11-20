// function runRobot(state, robot, memory) {
//   for (let turns = 0; ; turns++) {
//     console.log(1111111111, turns);
//     console.log(555, state.parcels);
//     if (state.parcels.length === 0) {
//       console.log(1111, turns);
//       return turns;
//     }
//     const hmm = robot(state, memory);
//     memory = hmm.memory;
//     state = state.move(hmm.direction);

//     console.log(8888, state);
//   }

//   // console.log(robot);
// }

//-------------------------------------------

const roads = [
  "Alice's House-Bob's House",
  "Alice's House-Cabin",
  "Alice's House-Post Office",
  "Bob's House-Town Hall",
  "Daria's House-Ernie's House",
  "Daria's House-Town Hall",
  "Ernie's House-Grete's House",
  "Grete's House-Farm",
  "Grete's House-Shop",
  "Marketplace-Farm",
  "Marketplace-Post Office",
  "Marketplace-Shop",
  "Marketplace-Town Hall",
  "Shop-Town Hall",
];

function buildGraph(edges) {
  let graph = Object.create(null);

  function addEdge(from, to) {
    if (from in graph) {
      graph[from].push(to);
    } else {
      graph[from] = [to];
    }
  }
  // console.log(edges.map((r) => r.split("-")));
  for (let [from, to] of edges.map((r) => r.split("-"))) {
    addEdge(from, to);
    addEdge(to, from);
  }
  return graph;
}

const roadGraph = buildGraph(roads);

// console.log(roadGraph);

class VillageState {
  constructor(place, parcels) {
    this.place = place;
    this.parcels = parcels;
  }

  move(destination) {
    if (!roadGraph[this.place].includes(destination)) {
      return this;
    } else {
      let parcels = this.parcels
        .map((p) => {
          if (p.place != this.place) return p;
          return { place: destination, address: p.address };
        })
        .filter((p) => p.place != p.address);
      return new VillageState(destination, parcels);
    }
  }
}

function runRobot(state, robot, memory) {
  for (let turn = 0; ; turn++) {
    if (state.parcels.length == 0) {
      return turn;
    }
    let action = robot(state, memory);
    state = state.move(action.direction);
    memory = action.memory;
  }
}

function randomPick(array) {
  let choice = Math.floor(Math.random() * array.length);
  return array[choice];
}

function randomRobot(state) {
  return { direction: randomPick(roadGraph[state.place]) };
}

VillageState.random = function (parcelCount = 5) {
  let parcels = [];
  for (let i = 0; i < parcelCount; i++) {
    let address = randomPick(Object.keys(roadGraph));
    let place;
    do {
      place = randomPick(Object.keys(roadGraph));
    } while (place == address);
    parcels.push({ place, address });
  }
  return new VillageState("Post Office", parcels);
};

// runRobot(VillageState.random(), randomRobot);

//-------------------------------------------------------

const mailRoute = [
  "Alice's House",
  "Cabin",
  "Alice's House",
  "Bob's House",
  "Town Hall",
  "Daria's House",
  "Ernie's House",
  "Grete's House",
  "Shop",
  "Grete's House",
  "Farm",
  "Marketplace",
  "Post Office",
];

function routeRobot(state, memory) {
  if (memory.length == 0) {
    memory = mailRoute; // Reset to the full route if memory is empty
  }
  return { direction: memory[0], memory: memory.slice(1) }; // Move to the next place
}

//-----------------------------------------------------------------------

// // Goal-oriented robot: Plans a route to pick up or deliver parcels
function goalOrientedRobot({ place, parcels }, route) {
  if (route.length == 0) {
    // No planned route
    let parcel = parcels[0]; // Focus on the first parcel
    if (parcel.place != place) {
      // Parcel is not yet picked up
      route = findRoute(roadGraph, place, parcel.place);
    } else {
      // Parcel is picked up, deliver it
      route = findRoute(roadGraph, place, parcel.address);
    }
  }

  return { direction: route[0], memory: route.slice(1) }; // Move and update memory
}

function eRobot({ place, parcels }, route) {
  if (route.length == 0) {
    let parcelList = [];

    for (let i = 0; i < parcels.length; i++) {
      let parcel = parcels[i];
      const a = findRoute(roadGraph, place, parcel.place);
      parcelList.push([a, parcel]);
    }

    let route9 = parcelList.reduce((shortest, current) => {
      if (current[0].length === shortest[0].length) {
        return current[1].place != place ? current : shortest;
      }
      return current[0].length < shortest[0].length ? current : shortest;
    }, parcelList[0]);

    if (route9[1].place != place) {
      route = route9[0];
    } else {
      // Parcel is picked up, deliver it
      route = findRoute(roadGraph, place, route9[1].address);
    }
  }

  return { direction: route[0], memory: route.slice(1) }; // Move and update memory
}

//------------------------------------

function lazyRobot({ place, parcels }, route) {
  if (route.length === 0) {
    let routes = parcels.map((p) => {
      if (p.place != place) {
        // Parcel is not yet picked up
        return { route: findRoute(roadGraph, place, p.place), pickUp: true };
      } else {
        // Parcel is picked up, deliver it
        return { route: findRoute(roadGraph, place, p.address), pickUp: false };
      }
    });

    function sort({ route, pickUp }) {
      return (pickUp ? 0.5 : 0) - route.length;
    }

    route = routes.reduce((a, b) => {
      return sort(a) > sort(b) ? a : b;
    }).route;
  }

  return { direction: route[0], memory: route.slice(1) }; // Move and update memory
}

//-------------------------------------

// Function to find the shortest route between two points in a graph
function findRoute(graph, from, to) {
  let work = [{ at: from, route: [] }]; // Initialize work queue with the starting point

  for (let i = 0; i < work.length; i++) {
    let { at, route } = work[i]; // Deconstruct the current location and route

    // Explore all neighboring locations
    for (let place of graph[at]) {
      if (place == to) {
        // If the target location is found, return the completed route
        return route.concat(place);
      }

      // If this place hasn't been explored yet, add it to the work queue
      if (!work.some((w) => w.at == place)) {
        work.push({ at: place, route: route.concat(place) });
      }
    }
  }
}

//---------------------------------------------------------------------------------

function compareRobots(
  robot1,
  memory1,
  robot2,
  memory2,
  robot3,
  memory3,
  robot4,
  memory4
) {
  let z = 0;
  let x = 0;
  let e = 0;
  let f = 0;
  for (let i = 0; i < 100; i++) {
    const state = VillageState.random();
    const a = runRobot(state, robot1, memory1);
    const b = runRobot(state, robot2, memory2);
    const c = runRobot(state, robot3, memory3);
    const d = runRobot(state, robot4, memory4);
    z += a;
    x += b;
    e += c;
    f += d;
  }
  z = Math.round(z / 100);
  x = Math.round(x / 100);
  e = Math.round(e / 100);
  f = Math.round(f / 100);
  console.log(
    `ROBOT 1: ${z} turns \nROBOT 2: ${x} turns \nEROBOT 3: ${e} turns \nLAZY: ${f}`
  );
}

compareRobots(routeRobot, [], goalOrientedRobot, [], eRobot, [], lazyRobot, []);
