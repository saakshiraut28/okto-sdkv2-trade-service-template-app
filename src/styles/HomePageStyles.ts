const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    padding: "2rem",
    fontFamily: "sans-serif",
    color: "#ffffff",
    backgroundColor: "#121212",
    textAlign: "center",
  },
  contentWrapper: {
    maxWidth: "600px",
    width: "100%",
    padding: "1rem",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "0.5rem",
  },
  description: {
    marginBottom: "2rem",
    fontSize: "1.1rem",
    color: "#bbbbbb",
  },
  cardTitle: {
    fontSize: "1.25rem",
    marginTop: "2rem",
    marginBottom: "0.5rem",
    color: "#ffffff",
  },
  button: {
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    borderRadius: "0.5rem",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    cursor: "pointer",
    marginBottom: "1rem",
  },
  secondaryButton: {
    padding: "0.5rem 1.25rem",
    fontSize: "1rem",
    borderRadius: "0.5rem",
    backgroundColor: "#1976D2",
    color: "white",
    border: "none",
  },
  warningText: {
    color: "#ffcc00",
    fontSize: "0.9rem",
    marginTop: "0.5rem",
  },
};

export default styles;
