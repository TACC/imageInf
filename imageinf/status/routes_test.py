def test_status(client_authed):
    response = client_authed.get("/status")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
