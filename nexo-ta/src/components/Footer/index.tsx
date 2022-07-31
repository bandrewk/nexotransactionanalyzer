import classes from "./index.module.css";

const Footer = () => {
  return (
    <footer className={classes.footer}>
      <p>Version 1.0.1.</p>
      <p>
        Currency exchange data is provided by Coingecko, Coinbase and the
        European Central Bank (EUROSYSTEM).
      </p>

      <p>
        This website is distributed in the hope that it will be useful, but
        WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
        Public License for more details.
      </p>
      <p>
        <span>Notice of Non-Affiliation and Disclaimer</span>
      </p>
      <p>
        We are not affiliated, associated, authorized, endorsed by, or in any
        way officially connected with Nexo Financial LLC, or any of its
        subsidiaries or its affiliates. The official Nexo Financial LLC website
        can be found at https://www.nexo.io. The name NEXO as well as related
        names, marks, emblems and images are registered trademarks of their
        respective owners.
      </p>
    </footer>
  );
};

export default Footer;
