"""Plain IDW 지도(발표 10페이지 가운데 패널)를 논문 Fig.4/6과 같은 방식으로 생성한다.

논문 v3에는 Plain IDW 지도 그림이 없다(표에만 있다). 그래서 Fig.4·5·6을 만든
archive/paper/figure_archive/make_fig456.py와 같은 데이터·같은 draw 설정을 그대로 쓴다.
색 범위(viridis, -95~-20 dBm)와 마커·범례를 맞춰야 세 패널을 나란히 비교할 수 있다.
"""

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

WS = Path("/data/RFVisualizer_Workspace")
RUN = WS / "experiments/0821_lounge_201729"
GRID = RUN / "analysis/reverse_only/processed/grid_predictions.csv"
POINTS = RUN / "processed/sionna_points.csv"
OUT = Path(__file__).resolve().parent.parent / "assets" / "plain-idw.png"
TX = (21.37, 17.83)  # configs/tx_rx.json

rows = list(csv.DictReader(open(GRID)))
r = np.array([int(x["row"]) for x in rows])
c = np.array([int(x["column"]) for x in rows])
xs = np.full(c.max() + 1, np.nan)
ys = np.full(r.max() + 1, np.nan)
xs[c] = [float(x["x"]) for x in rows]
ys[r] = [float(x["y"]) for x in rows]
xs = xs[np.nanargmin(xs)] + 0.75 * (np.arange(len(xs)) - np.nanargmin(xs))
ys = ys[np.nanargmin(ys)] + 0.75 * (np.arange(len(ys)) - np.nanargmin(ys))

plain = np.full((len(ys), len(xs)), np.nan)
plain[r, c] = [float(x["plain_idw_rssi_dbm"]) for x in rows]

pts = list(csv.DictReader(open(POINTS)))
cal = np.array([[float(p["x"]), float(p["y"])] for p in pts if p["point_role"] == "calibration"])
test = np.array([[float(p["x"]), float(p["y"])] for p in pts if p["point_role"] == "test"])
assert len(cal) == 4 and len(test) == 10

plt.rcParams.update({"font.size": 20})
fig, ax = plt.subplots(figsize=(14.4, 7.2))
im = ax.pcolormesh(xs, ys, plain, shading="nearest", cmap="viridis", vmin=-95, vmax=-20)
fig.colorbar(im, ax=ax, label="Estimated RSSI (dBm)", fraction=0.035, pad=0.02)
ax.scatter(*test.T, marker="x", color="white", s=220, linewidths=4, label="Test point")
ax.scatter(*cal.T, marker="s", color="#1a9641", edgecolor="white", s=220, linewidths=2,
           label="Calibration point")
ax.scatter(*TX, marker="*", color="red", edgecolor="white", s=900, linewidths=1.5,
           label="Transmitter")
ax.set_aspect("equal")
ax.set_xlabel("X (m)", fontsize=26)
ax.set_ylabel("Y (m)", fontsize=26)
ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.2), ncol=3, fontsize=16,
          frameon=True, facecolor="0.8", edgecolor="0.8")
ax.set_facecolor("white")
fig.savefig(OUT, dpi=100, bbox_inches="tight")
plt.close(fig)
print("wrote", OUT, "| plain IDW range %.1f ~ %.1f dBm" % (np.nanmin(plain), np.nanmax(plain)))
