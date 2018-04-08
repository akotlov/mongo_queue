// eslint-disable-next-line no-console

function getFirstUser() {
  return getUsers()
    .then((users) => {
      console.log(users[0].name);
      return users[0].name;
    })
    .catch(err => ({
      name: 'default user',
    }));
}

let getUsers = () => new Promise((resolve => setTimeout(() => {
  const users = [{ name: 'user2' }];
  resolve(users);
}, 5000)));

const add = (xPromise, yPromise) =>
  // `Promise.all([ .. ])` takes an array of promises,
  // and returns a new promise that waits on them
  // all to finish
  (
    Promise.all([xPromise, yPromise])

      // when that promise is resolved, let's take the
      // received `X` and `Y` values and add them together.
      .then(values =>
        // `values` is an array of the messages from the
        // previously resolved promises
        `${values[0].name} ${values[1].name}`)
  );
const fetchX = () => new Promise((resolve => setTimeout(() => {
  const users = { name: 'user2' };
  resolve(users);
}, 1000)));

const fetchY = () => new Promise(((resolve, reject) => {
  if (true) {
    return setTimeout(() => {
      const users = { name: 'user5' };
      resolve(users);
    }, 2000);
  }
  reject(new Error('network error'));
}));

module.exports = {
  add,
  fetchX,
  fetchY,
};

// getFirstUser();
