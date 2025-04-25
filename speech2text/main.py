from flask import Flask, request
from model import create_pipeline
import time

pipe = create_pipeline()
app = Flask(__name__)


@app.route("/", methods=["POST"])
def post():
    start = time.perf_counter()

    result = pipe(request.stream.read(), generate_kwargs={
        "language": "russian",
        "forced_decoder_ids": None,
    })["text"]
    end = time.perf_counter()

    print(f"Time taken: {end - start:.2f} seconds")
    return result


app.run(debug=True)
