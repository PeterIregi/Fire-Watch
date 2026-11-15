# Unusual Period (Anomaly) Detection Specification (Domain D)

This document formalizes the browser-side anomaly detection engine based on `system-design.md` §4.7.

## 1. Methodology: Robust Z-Score (Median & MAD)

Standard z-scores based on mean and standard deviation are heavily distorted by extreme fire events. FireWatch uses **Median Absolute Deviation (MAD)** and robust z-scores computed on the selected area's summed series:

$$\text{Baseline}(m, y) = \{ x(m, y') \mid y' \neq y, x \neq \text{null} \}$$
$$\text{Median} = \text{median}(\text{Baseline})$$
$$\text{MAD} = \text{median}(\{ |x - \text{Median}| \mid x \in \text{Baseline} \})$$

### Robust Z-Score Formula:
$$z_{\text{robust}} = \frac{0.6745 \times (x - \text{Median})}{\text{MAD}}$$

- The factor $0.6745 \approx 1 / 1.4826$ scales the MAD to the normal distribution standard deviation ($\sigma$).
- **Default Thresholds:**
  - **High Fire Anomaly:** $z_{\text{robust}} \ge +3.5$
  - **Low Fire Anomaly:** $z_{\text{robust}} \le -3.5$
  - Thresholds are user-configurable.

---

## 2. Fallback Rules (Agreement with Silas / Science)

In fire data, dry months have high variance, while wet months (April–May) often have predominantly 0 detections, resulting in $\text{MAD} = 0$.

1. **Primary Case ($\text{MAD} > 0$):**
   Standard robust z-score: $z = 0.6745 \times (x - \text{Median}) / \text{MAD}$.
2. **Fallback 1 ($\text{MAD} = 0$ but $\text{IQR} > 0$):**
   Interquartile Range $\text{IQR} = Q_3 - Q_1$.
   In a normal distribution, $\text{IQR} \approx 1.349 \sigma$.
   $$z_{\text{IQR}} = \frac{x - \text{Median}}{\text{IQR} / 1.349} = \frac{1.349 \times (x - \text{Median})}{\text{IQR}}$$
3. **Fallback 2 ($\text{MAD} = 0$ and $\text{IQR} = 0$):**
   When almost all baseline observations are identical (e.g., zeroes):
   - Flag as **High Anomaly** if $x - \text{Median} \ge \text{absoluteThreshold}$ (default 15 hotspots).
   - Flag as **Low Anomaly** if $\text{Median} - x \ge \text{absoluteThreshold}$.
4. **Sample History Minimum:**
   At least 3 historical baseline years are required ($\ge 3$) before flagging anomalies.
