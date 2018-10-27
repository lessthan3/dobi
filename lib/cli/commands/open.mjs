import opn from 'opn';

export default async (...args) => {
  const url = args.reduce((str, arg) => (
    `${str}/${arg}`
  ), 'https://www.maestro.io');
  opn(url);
};
